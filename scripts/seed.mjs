// Docasny skript: vytahne par skutecnych inzeratu ze Srealit jako testovaci data
// pro vyvoj hry. NENI to ostry scraper (ten prijde v kroku 5).
import { writeFileSync, mkdirSync } from "node:fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0";

// "Rodinný" -> "rodinny" (adresy na Srealitech jsou bez diakritiky a male)
const deacc = (s) =>
  (s || "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

async function nextData(url) {
  const html = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
  const d = JSON.parse(m[1]);
  const q = d.props.pageProps.dehydratedState.queries.find((x) => x?.state?.data?.results?.length);
  return q.state.data.results;
}

function detailUrl(r) {
  const typ = r.categoryMainCb.value === 1 ? "byt" : "dum";
  const l = r.locality;
  const misto = [l.citySeoName, l.cityPartSeoName, l.streetSeoName].filter(Boolean).join("-");
  const disp = encodeURIComponent(deacc(r.categorySubCb?.name));
  return `https://www.sreality.cz/detail/prodej/${typ}/${disp}/${misto}/${r.id}`;
}

async function status(url) {
  try {
    return (await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" })).status;
  } catch { return 0; }
}

function mapuj(r, typ) {
  const l = r.locality;
  const plocha = Number((r.name.match(/([\d\s]+)\s*m²/) || [])[1]?.replace(/\s/g, "")) || null;
  return {
    id: String(r.id),
    url: detailUrl(r),
    typ,
    dispozice: r.categorySubCb?.name ?? null,
    plochaM2: plocha,
    cena: r.priceCzk ?? null,
    cenaZaM2: r.priceCzkPerSqM ?? null,
    nazev: r.name,
    obec: l.city ?? null,
    castObce: l.cityPart ?? null,
    okres: l.district ?? null,
    kraj: l.region ?? null,
    lat: l.latitude ?? null,
    lon: l.longitude ?? null,
    fotky: (r.images || []).map((i) => (i.url.startsWith("//") ? "https:" + i.url : i.url)),
    aktivni: true,
    cenaHistorie: [],
  };
}

const dnes = new Date().toISOString().slice(0, 10);
const out = [];

for (const [typ, zdroj] of [
  ["byt", "https://www.sreality.cz/hledani/prodej/byty"],
  ["dum", "https://www.sreality.cz/hledani/prodej/domy"],
]) {
  const results = await nextData(zdroj);
  console.log(`${zdroj} -> ${results.length} zaznamu`);
  let vzato = 0;
  for (const r of results) {
    if (vzato >= 4) break;
    const z = mapuj(r, typ);
    if (!z.cena || !z.plochaM2 || z.fotky.length < 3) continue;
    const st = await status(z.url);
    console.log(`  ${st}  ${z.obec.padEnd(22)} ${String(z.dispozice).padEnd(10)} ${String(z.cena).padStart(9)} Kc  fotek:${z.fotky.length}`);
    if (st !== 200) continue;
    z.cenaHistorie = [{ datum: dnes, cena: z.cena }];
    out.push(z);
    vzato++;
  }
}

mkdirSync("src/data", { recursive: true });
writeFileSync(
  "src/data/inzeraty.json",
  JSON.stringify({ verze: 1, sebranoDne: dnes, inzeraty: out }, null, 2) + "\n",
  "utf8"
);
console.log(`\nulozeno ${out.length} inzeratu (${out.filter(x=>x.typ==="byt").length} bytu, ${out.filter(x=>x.typ==="dum").length} domu)`);
