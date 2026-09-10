// Doplni chybejici fotky u uz nasbiranych inzeratu.
//
//   node scripts/vice-fotek.mjs              vsechny inzeraty
//   node scripts/vice-fotek.mjs --limit 20   jen prvnich 20, na vyzkouseni
//
// Puvodne se ukladalo jen 15 fotek na inzerat, coz jsou asi dve tretiny toho,
// co inzeraty skutecne maji - chybel prave konec galerie s koupelnou a
// pudorysem.
//
// Stavajici adresy se NEMENI, nove se jen pripojuji za ne. Fotky maji na R2
// klic podle poradi (<id>/3.jpg), takze prehazeni seznamu by znamenalo, ze
// adresa ukazuje na jiny obrazek, nez ktery na tom miste doopravdy je.
//
// Po dobehnuti: node scripts/fotky.mjs --nove

import { readFileSync, writeFileSync } from "node:fs";

const MAX_FOTEK = 40;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0";
const PAUZA_MS = 300;
const SOUBEZNE = 3;
const ZAPIS_PO = 50; // prubezne ukladani, at vypadek site nezahodi praci

const DATA = "src/data/inzeraty.json";
const ZDROJE = "data/fotky-zdroje.json";

const argv = process.argv.slice(2);
const iLimit = argv.indexOf("--limit");
const LIMIT = iLimit >= 0 ? Number(argv[iLimit + 1]) : null;

const spi = (ms) => new Promise((r) => setTimeout(r, ms));

async function fotkyZDetailu(url) {
  try {
    const html = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return null;
    const d = JSON.parse(m[1]);
    const q = d?.props?.pageProps?.dehydratedState?.queries?.find((x) => x?.state?.data?.images);
    const obrazky = q?.state?.data?.images;
    if (!obrazky?.length) return null;
    return obrazky
      .map((i) => (i.url?.startsWith("//") ? "https:" + i.url : i.url))
      .filter(Boolean);
  } catch {
    return null;
  }
}

const db = JSON.parse(readFileSync(DATA, "utf8"));
const zdroje = JSON.parse(readFileSync(ZDROJE, "utf8"));
const inzeraty = LIMIT ? db.inzeraty.slice(0, LIMIT) : db.inzeraty;

console.log(`Prochazim ${inzeraty.length} inzeratu, strop ${MAX_FOTEK} fotek na inzerat.\n`);

let doplneno = 0;
let pribyloFotek = 0;
let bezeZmeny = 0;
let nedostupnych = 0;

function uloz() {
  writeFileSync(ZDROJE, JSON.stringify(zdroje) + "\n", "utf8");
  writeFileSync(DATA, JSON.stringify(db, null, 2) + "\n", "utf8");
}

for (let i = 0; i < inzeraty.length; i += SOUBEZNE) {
  const davka = inzeraty.slice(i, i + SOUBEZNE);

  const vysledky = await Promise.all(
    davka.map(async (z) => [z, await fotkyZDetailu(z.url)])
  );

  for (const [z, cerstve] of vysledky) {
    if (!cerstve) {
      nedostupnych++;
      continue;
    }

    const stare = zdroje[z.id] ?? [];
    // Pripojujeme jen to, co jeste nemame, a v poradi, v jakem to prislo.
    const chybejici = cerstve.filter((u) => !stare.includes(u));
    const spojene = [...stare, ...chybejici].slice(0, MAX_FOTEK);

    if (spojene.length === stare.length) {
      bezeZmeny++;
      continue;
    }

    pribyloFotek += spojene.length - stare.length;
    doplneno++;
    zdroje[z.id] = spojene;
    z.pocetFotek = spojene.length;
    // Znacka pryc, aby scripts/fotky.mjs --nove tenhle inzerat vzal.
    delete z.fotkyNahrany;
  }

  if ((i + SOUBEZNE) % ZAPIS_PO < SOUBEZNE) uloz();

  process.stdout.write(
    `\r  ${String(Math.min(i + SOUBEZNE, inzeraty.length)).padStart(5)}/${inzeraty.length}` +
      `  doplneno ${doplneno}  novych fotek ${pribyloFotek}  beze zmeny ${bezeZmeny}  nedostupnych ${nedostupnych}   `
  );

  await spi(PAUZA_MS);
}

uloz();

const celkem = db.inzeraty.reduce((s, z) => s + z.pocetFotek, 0);
console.log("\n");
console.log(`Doplneno u ${doplneno} inzeratu, pribylo ${pribyloFotek} fotek.`);
console.log(`Beze zmeny ${bezeZmeny}, nedostupnych detailu ${nedostupnych}.`);
console.log(`Fotek celkem: ${celkem} (prumer ${(celkem / db.inzeraty.length).toFixed(1)} na inzerat).`);
console.log("\nDalsi krok: node scripts/fotky.mjs --nove");
