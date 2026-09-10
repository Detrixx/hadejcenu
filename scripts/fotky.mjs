// Stahne fotky ze Srealit a nahraje je do R2, aby hra nezavisela na tom,
// jestli inzerat porad existuje.
//
//   node scripts/fotky.mjs --test         jen overi spojeni s R2
//   node scripts/fotky.mjs --limit 5      zkusi prvnich 5 inzeratu
//   node scripts/fotky.mjs --nove         jen inzeraty z posledniho sberu
//   node scripts/fotky.mjs                vsechno
//
// Skript lze kdykoli prerusit a spustit znovu - uz nahrane fotky preskoci.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { AwsClient } from "aws4fetch";
import { zdrojUrl } from "../src/lib/fotky.js";

process.loadEnvFile(".env");

const {
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_BUCKET, R2_VEREJNA_URL,
} = process.env;

for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_VEREJNA_URL })) {
  if (!v) { console.error(`Chybi ${k} v souboru .env`); process.exit(1); }
}

const SOUBEZNE = 6;
const DATA = "src/data/inzeraty.json";
const ZDROJE = "data/fotky-zdroje.json";
const zaklad = R2_VEREJNA_URL.replace(/\/+$/, "");
const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0";

const r2 = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

const existuje = async (klic) =>
  (await r2.fetch(`${endpoint}/${klic}`, { method: "HEAD" })).status === 200;

async function nahraj(klic, telo, typ) {
  const r = await r2.fetch(`${endpoint}/${klic}`, {
    method: "PUT",
    body: telo,
    headers: { "Content-Type": typ, "Cache-Control": "public, max-age=31536000, immutable" },
  });
  if (!r.ok) throw new Error(`PUT ${klic}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
}

const smaz = (klic) => r2.fetch(`${endpoint}/${klic}`, { method: "DELETE" });

// --- test spojeni ------------------------------------------------------------

async function test() {
  const klic = "_test/spojeni.txt";
  const obsah = `test ${new Date().toISOString()}`;

  console.log("1/3 nahravam testovaci soubor...");
  await nahraj(klic, obsah, "text/plain");
  console.log("    ok");

  console.log("2/3 stahuji ho z verejne adresy...");
  const r = await fetch(`${zaklad}/${klic}`, { cache: "no-store" });
  if (!r.ok) {
    console.error(`    CHYBA: HTTP ${r.status}`);
    console.error("    Bucket nema zapnuty verejny pristup (Settings -> Public Development URL).");
    process.exit(1);
  }
  if ((await r.text()).trim() !== obsah) {
    console.error("    CHYBA: vratil se jiny obsah, nez jsme nahrali.");
    process.exit(1);
  }
  console.log("    ok, obsah souhlasi");

  console.log("3/3 uklizim...");
  await smaz(klic);
  console.log("    ok\n");
  console.log("Spojeni s R2 funguje v obou smerech.");
}

// --- nahrani fotek -----------------------------------------------------------

// Kratky vypadek site shodi cely pozadavek chybou "fetch failed". Pri
// tisicich souboru je to skoro jisté, tak to nekolikrat zopakujeme
// s rostouci pauzou, nez to prohlasime za chybu.
async function sPokusy(akce, pokusu = 3) {
  let posledni;
  for (let i = 0; i < pokusu; i++) {
    try {
      return await akce();
    } catch (e) {
      posledni = e;
      if (i < pokusu - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw posledni;
}

async function jednaFotka(zdroj, klic, velikost) {
  if (await existuje(klic)) return "preskoceno";
  const r = await fetch(zdrojUrl(zdroj, velikost), {
    headers: { "User-Agent": UA, Referer: "https://www.sreality.cz/" },
  });
  if (!r.ok) throw new Error(`stazeni selhalo: HTTP ${r.status}`);
  const data = new Uint8Array(await r.arrayBuffer());
  await nahraj(klic, data, r.headers.get("content-type") ?? "image/jpeg");
  return data.byteLength;
}

async function nahrajVse(limit, jenNove = false) {
  if (!existsSync(ZDROJE)) {
    console.error(`Chybi ${ZDROJE} - nejprve spust scripts/sber.mjs`);
    process.exit(1);
  }
  const db = JSON.parse(readFileSync(DATA, "utf8"));
  const zdroje = JSON.parse(readFileSync(ZDROJE, "utf8"));

  // Bez --nove se u kazde fotky nejdriv overuje, jestli uz v bucketu je.
  // Po doplneni par set inzeratu je to desetitisice dotazu na veci, ktere
  // davno mame. Znacka fotkyNahrany se nastavi nize u kazdeho inzeratu,
  // ktery projde bez chyby - datum sberu by na to nestacilo, dva behy
  // se o nej muzou delit.
  let inzeraty = db.inzeraty;
  if (jenNove) {
    inzeraty = inzeraty.filter((z) => !z.fotkyNahrany);
    console.log(`Jen inzeraty bez nahranych fotek: ${inzeraty.length}.`);
  }
  if (limit) inzeraty = inzeraty.slice(0, limit);
  const celkemFotek = inzeraty.reduce((s, z) => s + (zdroje[z.id]?.length ?? 0), 0);

  console.log(`${inzeraty.length} inzeratu, ${celkemFotek} fotek (kazda ve dvou velikostech).\n`);

  let hotovo = 0, preskoceno = 0, bajtu = 0;
  const chyby = [];
  // Inzeraty, u kterych proslo vsechno. Jen ty smi dostat znacku - kdyby
  // se jedina fotka nenahrala, priste by se uz nedotahla.
  const bezChyby = new Set();

  for (const [poradi, z] of inzeraty.entries()) {
    const chybPredtim = chyby.length;
    const ukoly = (zdroje[z.id] ?? []).flatMap((zdroj, i) => [
      [zdroj, `${z.id}/${i}.jpg`, "velka"],
      [zdroj, `${z.id}/${i}_n.jpg`, "nahled"],
    ]);

    for (let i = 0; i < ukoly.length; i += SOUBEZNE) {
      const davka = ukoly.slice(i, i + SOUBEZNE);
      const vysledky = await Promise.allSettled(
        davka.map(([zdroj, klic, vel]) => sPokusy(() => jednaFotka(zdroj, klic, vel)))
      );
      vysledky.forEach((v, j) => {
        if (v.status === "rejected") chyby.push({ klic: davka[j][1], duvod: String(v.reason).slice(0, 80) });
        else if (v.value === "preskoceno") preskoceno++;
        else { hotovo++; bajtu += v.value; }
      });
    }

    if (chyby.length === chybPredtim) bezChyby.add(z.id);

    process.stdout.write(
      `\r  ${String(poradi + 1).padStart(4)}/${inzeraty.length}  nahrano ${hotovo}  preskoceno ${preskoceno}  chyb ${chyby.length}  ${(bajtu / 1024 / 1024).toFixed(0)} MB   `
    );
  }

  console.log("\n");
  if (chyby.length) {
    console.log("Nepodarilo se nahrat:");
    for (const c of chyby.slice(0, 20)) console.log(`  ${c.klic}  ${c.duvod}`);
    if (chyby.length > 20) console.log(`  ...a dalsich ${chyby.length - 20}`);
    console.log("");
  }
  // Znacky zapisujeme vzdycky, i kdyz beh skonci chybou. Inzeraty, u kterych
  // proslo vsechno, uz priste nema smysl kontrolovat - jinak by kazdy vypadek
  // site zahodil i praci, ktera se povedla.
  //
  // Soubor nacteme znovu a menime v nem jen tyhle polozky. Kdybychom zapsali
  // kopii z zacatku behu, prepsali bychom vsechno, co mezitim zapsal
  // soubezne bezici sber - a nove inzeraty by zmizely.
  const aktualni = JSON.parse(readFileSync(DATA, "utf8"));
  aktualni.fotkyZaklad = zaklad;
  for (const z of aktualni.inzeraty) {
    if (bezChyby.has(z.id)) z.fotkyNahrany = true;
  }
  writeFileSync(DATA, JSON.stringify(aktualni, null, 2) + "\n", "utf8");

  if (chyby.length > celkemFotek * 0.05) {
    console.error(
      `PRERUSENO: prilis mnoho chyb (${chyby.length}). Hotovych inzeratu: ${bezChyby.size}, ` +
        `zbytek dotahne dalsi spusteni prikazem --nove.`
    );
    process.exit(1);
  }
  console.log(`Hotovo. Nahrano ${hotovo}, preskoceno ${preskoceno}, chyb ${chyby.length}, celkem ${(bajtu / 1024 / 1024).toFixed(0)} MB.`);
  console.log(`Fotky se nacitaji z ${zaklad}`);
}

// --- spusteni ----------------------------------------------------------------

const args = process.argv.slice(2);
if (args.includes("--test")) {
  await test();
} else {
  const i = args.indexOf("--limit");
  await nahrajVse(i >= 0 ? Number(args[i + 1]) : null, args.includes("--nove"));
}
