// Sber inzeratu ze Srealit do src/data/inzeraty.json
//
//   node scripts/sber.mjs [pocet]                  rovnomerne pres vsechny kraje
//   node scripts/sber.mjs [pocet] --kraj praha     doplni jen jeden kraj
//
// Databaze jen roste - uz nasbirane inzeraty zustavaji a kvota se pocita
// na celkovy pocet, ne na pocet novych.
//
// Fotky se zatim jen odkazuji; stazeni a nahrani na R2 resi scripts/fotky.mjs.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const CIL = Number(argv.find((a) => /^\d+$/.test(a))) || 300;
const jenKrajIndex = argv.indexOf("--kraj");
const JEN_KRAJ = jenKrajIndex >= 0 ? argv[jenKrajIndex + 1] : null;
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
// Adresni tvar -> nazev, jaky Sreality vraci v datech. Potrebujeme ho,
// abychom u uz nasbiranych inzeratu poznali, do ktereho kraje patri.
const KRAJE_NAZVY = {
  "praha": "Hlavní město Praha",
  "stredocesky-kraj": "Středočeský kraj",
  "jihocesky-kraj": "Jihočeský kraj",
  "plzensky-kraj": "Plzeňský kraj",
  "karlovarsky-kraj": "Karlovarský kraj",
  "ustecky-kraj": "Ústecký kraj",
  "liberecky-kraj": "Liberecký kraj",
  "kralovehradecky-kraj": "Královéhradecký kraj",
  "pardubicky-kraj": "Pardubický kraj",
  "vysocina-kraj": "Kraj Vysočina",
  "jihomoravsky-kraj": "Jihomoravský kraj",
  "olomoucky-kraj": "Olomoucký kraj",
  "zlinsky-kraj": "Zlínský kraj",
  "moravskoslezsky-kraj": "Moravskoslezský kraj",
};

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

// Sreality pouzivaji cenu 1 Kc pro "cena na vyzadani" a drazby - takovy
// inzerat se hadat neda. Horni mez musi odpovidat slideru v src/lib/hra.js,
// jinak by se spravna odpoved nedala zadat.
const MIN_CENA = 100_000;
const MAX_CENA = 60_000_000;

const pouzitelny = (z) =>
  z.cena >= MIN_CENA &&
  z.cena <= MAX_CENA &&
  z.plochaM2 > 0 &&
  z._fotky.length >= MIN_FOTEK &&
  z.obec &&
  z.kraj;

// --- hlavni beh -------------------------------------------------------------

const dnes = new Date().toISOString().slice(0, 10);

if (JEN_KRAJ && !KRAJE.includes(JEN_KRAJ)) {
  console.error(`Neznamy kraj "${JEN_KRAJ}". Moznosti:\n  ${KRAJE.join("\n  ")}`);
  process.exit(1);
}

const kraje = JEN_KRAJ ? [JEN_KRAJ] : KRAJE;
const naKombinaci = Math.ceil(CIL / (kraje.length * TYPY.length));

// Kolik stranek vypisu smime projit. Pri vyssi kvote jich je potreba vic -
// na strance je ~21 inzeratu a cast z nich uz mame nebo neprojde filtrem.
const MAX_STRAN = Math.min(40, Math.max(8, Math.ceil(naKombinaci / 5)));

console.log(
  JEN_KRAJ
    ? `Doplnujeme jen ${KRAJE_NAZVY[JEN_KRAJ]} na ${CIL} inzeratu, tj. ~${naKombinaci} na typ.\n`
    : `Cil ${CIL} inzeratu, tj. ~${naKombinaci} na kazdou kombinaci kraj/typ.\n`
);

// Databaze jen roste. Uz nasbirane inzeraty zustavaji - maji nahrane fotky
// na R2 a prodany inzerat je pro hru stejne dobry jako aktivni.
const cestaData = "src/data/inzeraty.json";
const cestaZdroje = "data/fotky-zdroje.json";

const stavajici = existsSync(cestaData)
  ? JSON.parse(readFileSync(cestaData, "utf8")).inzeraty ?? []
  : [];
const stavajiciZdroje = existsSync(cestaZdroje)
  ? JSON.parse(readFileSync(cestaZdroje, "utf8"))
  : {};

const hotovo = [];
const videna = new Set(stavajici.map((z) => String(z.id)));
let chyb = 0;

if (stavajici.length) {
  console.log(`V databazi uz je ${stavajici.length} inzeratu celkem.\n`);
}

const kolikJich = (typ, kraj) =>
  stavajici.filter((z) => z.typ === typ && z.kraj === kraj).length;

for (const [typ, typSlug] of TYPY) {
  for (const kraj of kraje) {
    // Kvota plati na celkovy pocet, ne na pocet novych - jinak by kraje,
    // kde uz neco mame, prerostly ostatni.
    const uzMame = kolikJich(typ, KRAJE_NAZVY[kraj] ?? kraj);
    const chci = Math.max(0, naKombinaci - uzMame);
    const vzato = [];

    if (chci === 0) {
      console.log(`  ${typ.padEnd(4)} ${kraj.padEnd(22)}   0  (uz mame ${uzMame})`);
      continue;
    }

    for (let strana = 1; strana <= MAX_STRAN && vzato.length < chci; strana++) {
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

console.log(`\nNove nasbirano ${hotovo.length}, nedostupnych detailu: ${chyb}`);

// Pojistka: kdyz Sreality zmeni strukturu stranky, sber nic nenajde.
// V tom pripade nechceme sahat na funkcni data.
if (stavajici.length && hotovo.length === 0 && chyb > 0) {
  console.error("\nPRERUSENO: nenasbirano nic a detaily selhavaly. Data nechavam beze zmeny.");
  process.exit(1);
}

// Zdrojove adresy fotek hra nepotrebuje - pouziva je jen scripts/fotky.mjs.
// Drzime je mimo src/, aby se nebalily do aplikace.
const zdroje = { ...stavajiciZdroje };
const nove = hotovo.map(({ _fotky, ...z }) => {
  zdroje[z.id] = _fotky;
  return z;
});
const proHru = [...stavajici, ...nove];

// fotkyZaklad nastavuje az scripts/fotky.mjs po nahrani; pokud uz nejaky
// znamy je, zachovame ho, at hra po novem sberu neztrati fotky.
const drive = existsSync(cestaData)
  ? (JSON.parse(readFileSync(cestaData, "utf8")).fotkyZaklad ?? null)
  : null;

mkdirSync("src/data", { recursive: true });
mkdirSync("data", { recursive: true });
writeFileSync(cestaZdroje, JSON.stringify(zdroje) + "\n", "utf8");
writeFileSync(
  cestaData,
  JSON.stringify({ verze: 3, sebranoDne: dnes, fotkyZaklad: drive, inzeraty: proHru }, null, 2) + "\n",
  "utf8"
);

const byty = proHru.filter((z) => z.typ === "byt").length;
const fotekNovych = hotovo.reduce((s, z) => s + z._fotky.length, 0);
console.log(
  `Ulozeno: ${proHru.length} inzeratu celkem (${byty} bytu, ${proHru.length - byty} domu).`
);
console.log(`Pribylo ${nove.length} inzeratu a ${fotekNovych} fotek k nahrani na R2.`);
console.log("\nDalsi krok: node scripts/fotky.mjs");
