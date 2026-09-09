// Sber inzeratu ze Srealit do src/data/inzeraty.json
//
//   node scripts/sber.mjs [pocet]      vychozi 300
//
// Fotky se zatim jen odkazuji; stazeni a nahrani na R2 resi scripts/fotky.mjs.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const CIL = Number(process.argv[2]) || 300;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0";
const PAUZA_MS = 350;     // mezi pozadavky, at Sreality nezatezujeme
const SOUBEZNE = 3;
const MIN_FOTEK = 5;
const MAX_FOTEK = 15;     // vic do hry netreba a setri to misto na R2

// Overeno dotazem - pozor, Vysocina ma v adrese jiny tvar, nez rika
// pole regionSeoName v datech (tam je "kraj-vysocina", funguje "vysocina-kraj").
const KRAJE = [
  "praha", "stredocesky-kraj", "jihocesky-kraj", "plzensky-kraj",
  "karlovarsky-kraj", "ustecky-kraj", "liberecky-kraj", "kralovehradecky-kraj",
  "pardubicky-kraj", "vysocina-kraj", "jihomoravsky-kraj", "olomoucky-kraj",
  "zlinsky-kraj", "moravskoslezsky-kraj",
];
const TYPY = [["byt", "byty"], ["dum", "domy"]];

const spi = (ms) => new Promise((r) => setTimeout(r, ms));
const deacc = (s) => (s || "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slug = (s) => deacc(s).trim().replace(/\s+/g, "-");

// Nevyplneny parametr posilaji Sreality jako {name:"- vyber ...", value:0}.
// Bez tohoto filtru by se v hre objevilo "Vytah: nezadano".
const nazev = (p) => (p && typeof p === "object" && p.value !== 0 && p.name ? p.name : null);

// Sreality posilaji nevyplnena cisla i jako prazdny retezec - bez tohoto
// by se ve hre objevila prazdna kolonka misto vynechaneho udaje.
const cislo = (v) => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
};

async function stahni(url, pokusu = 2) {
  for (let i = 0; i < pokusu; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.ok) return await r.text();
    } catch { /* zkusime znovu */ }
    await spi(600);
  }
  return null;
}

async function nextData(url) {
  const html = await stahni(url);
  if (!html) return null;
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function detailUrl(r) {
  const typ = r.categoryMainCb?.value === 1 ? "byt" : "dum";
  const l = r.locality ?? {};
  const misto = [l.citySeoName, l.cityPartSeoName, l.streetSeoName].filter(Boolean).join("-");
  return `https://www.sreality.cz/detail/prodej/${typ}/${encodeURIComponent(slug(r.categorySubCb?.name))}/${misto}/${r.id}`;
}

async function vypis(krajSlug, typSlug, strana) {
  const q = strana > 1 ? `?strana=${strana}` : "";
  const d = await nextData(`https://www.sreality.cz/hledani/prodej/${typSlug}/${krajSlug}${q}`);
  const query = d?.props?.pageProps?.dehydratedState?.queries?.find((x) => x?.state?.data?.results?.length);
  return query?.state?.data?.results ?? [];
}

async function detail(url) {
  const d = await nextData(url);
  const q = d?.props?.pageProps?.dehydratedState?.queries?.find((x) => x?.state?.data?.params);
  return q?.state?.data ?? null;
}

function sestav(zaznam, det, typ, dnes) {
  const l = zaznam.locality ?? {};
  const p = det.params ?? {};
  const zNazvu = Number((zaznam.name.match(/([\d\s]+)\s*m²/) || [])[1]?.replace(/\s/g, ""));
  const plocha = p.usableArea ?? (Number.isFinite(zNazvu) && zNazvu > 0 ? zNazvu : null);

  const fotky = (det.images?.length ? det.images : zaznam.images ?? [])
    .map((i) => (i.url?.startsWith("//") ? "https:" + i.url : i.url))
    .filter(Boolean)
    .slice(0, MAX_FOTEK);

  return {
    _fotky: fotky,
    id: String(zaznam.id),
    url: detailUrl(zaznam),
    typ,
    dispozice: zaznam.categorySubCb?.name ?? null,
    plochaM2: plocha,
    cena: zaznam.priceCzk ?? null,
    cenaZaM2: zaznam.priceCzkPerSqM ?? null,
    nazev: zaznam.name,

    obec: l.city ?? null,
    castObce: l.cityPart ?? null,
    okres: l.district ?? null,
    kraj: l.region ?? null,
    lat: l.latitude ?? null,
    lon: l.longitude ?? null,

    patro: typ === "byt" ? cislo(p.floorNumber) : null,
    pocetPodlazi: cislo(p.floors),
    plochaPozemku: typ === "dum" ? cislo(p.estateArea) : null,

    stavObjektu: nazev(p.buildingCondition),
    konstrukce: nazev(p.buildingType),
    vlastnictvi: nazev(p.ownership),
    energetickaTrida: nazev(p.energyEfficiencyRating),
    vytah: nazev(p.elevator),
    typObjektu: nazev(p.objectType),
    parkovani: cislo(p.parking),
    naklady: cislo(p.costOfLiving),

    pocetFotek: fotky.length,
    aktivni: true,
    vlozenoDne: p.since ?? null,
    sebranoDne: dnes,
    cenaHistorie: [{ datum: dnes, cena: zaznam.priceCzk ?? null }],
  };
}

const pouzitelny = (z) =>
  z.cena > 0 && z.plochaM2 > 0 && z._fotky.length >= MIN_FOTEK && z.obec && z.kraj;

// --- hlavni beh -------------------------------------------------------------

const dnes = new Date().toISOString().slice(0, 10);
const naKombinaci = Math.ceil(CIL / (KRAJE.length * TYPY.length));
console.log(`Cil ${CIL} inzeratu, tj. ~${naKombinaci} na kazdou kombinaci kraj/typ.\n`);

const hotovo = [];
const videna = new Set();
let chyb = 0;

for (const [typ, typSlug] of TYPY) {
  for (const kraj of KRAJE) {
    const chci = naKombinaci;
    const vzato = [];

    for (let strana = 1; strana <= 3 && vzato.length < chci; strana++) {
      const res = await vypis(kraj, typSlug, strana);
      await spi(PAUZA_MS);
      if (!res.length) break;

      const kandidati = res.filter((r) => r.priceCzk > 0 && !videna.has(String(r.id)));

      for (let i = 0; i < kandidati.length && vzato.length < chci; i += SOUBEZNE) {
        const davka = kandidati.slice(i, i + SOUBEZNE);
        const detaily = await Promise.all(
          davka.map(async (r) => {
            const u = detailUrl(r);
            const d = await detail(u);
            return [r, d];
          })
        );
        await spi(PAUZA_MS);

        for (const [r, d] of detaily) {
          if (vzato.length >= chci) break;
          if (!d) { chyb++; continue; }
          const z = sestav(r, d, typ, dnes);
          if (!pouzitelny(z)) continue;
          videna.add(z.id);
          vzato.push(z);
        }
      }
    }

    hotovo.push(...vzato);
    console.log(`  ${typ.padEnd(4)} ${kraj.padEnd(22)} ${String(vzato.length).padStart(3)}  (celkem ${hotovo.length})`);
  }
}

console.log(`\nNasbirano ${hotovo.length}, nedostupnych detailu: ${chyb}`);

// Pojistka: kdyz sber selze (Sreality zmeni strukturu), nechceme prepsat
// funkcni data prazdnym souborem.
const cesta = "src/data/inzeraty.json";
if (existsSync(cesta)) {
  const stare = JSON.parse(readFileSync(cesta, "utf8")).inzeraty?.length ?? 0;
  if (hotovo.length < Math.min(stare, CIL * 0.5)) {
    console.error(`\nPRERUSENO: nasbirano jen ${hotovo.length}, puvodni soubor ma ${stare}. Data nechavam beze zmeny.`);
    process.exit(1);
  }
}

// Zdrojove adresy fotek hra nepotrebuje - pouziva je jen scripts/fotky.mjs.
// Drzime je mimo src/, aby se nebalily do aplikace.
const zdroje = {};
const proHru = hotovo.map(({ _fotky, ...z }) => {
  zdroje[z.id] = _fotky;
  return z;
});

// fotkyZaklad nastavuje az scripts/fotky.mjs po nahrani; pokud uz nejaky
// znamy je, zachovame ho, at hra po novem sberu neztrati fotky.
const drive = existsSync(cesta)
  ? (JSON.parse(readFileSync(cesta, "utf8")).fotkyZaklad ?? null)
  : null;

mkdirSync("src/data", { recursive: true });
mkdirSync("data", { recursive: true });
writeFileSync("data/fotky-zdroje.json", JSON.stringify(zdroje) + "\n", "utf8");
writeFileSync(
  cesta,
  JSON.stringify({ verze: 3, sebranoDne: dnes, fotkyZaklad: drive, inzeraty: proHru }, null, 2) + "\n",
  "utf8"
);

const byty = hotovo.filter((z) => z.typ === "byt").length;
const fotek = hotovo.reduce((s, z) => s + z._fotky.length, 0);
console.log(`Ulozeno: ${hotovo.length} inzeratu (${byty} bytu, ${hotovo.length - byty} domu), ${fotek} fotek.`);
