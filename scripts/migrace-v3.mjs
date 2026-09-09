// Jednorazovy prevod dat do uspornejsiho tvaru (verze 3).
//
// Adresy fotek jdou odvodit z id inzeratu a poradi, takze je nemusime
// ukladat. Puvodni adresy ze Srealit hra nepotrebuje vubec - pouziva je
// jen nahravaci skript, takze patri mimo src/, aby se nebalily do aplikace.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const CESTA = "src/data/inzeraty.json";
const db = JSON.parse(readFileSync(CESTA, "utf8"));

if (db.verze >= 3) { console.log("Data uz jsou ve verzi 3, nic nedelam."); process.exit(0); }

const zaklad = db.inzeraty[0]?.fotky?.[0]?.match(/^(https:\/\/[^/]+)/)?.[1] ?? null;
if (!zaklad) { console.error("Nepodarilo se urcit zakladni adresu fotek."); process.exit(1); }

const zdroje = {};
let fotekCelkem = 0;

const inzeraty = db.inzeraty.map((z) => {
  const { fotky, fotkyNahled, fotkyZdroj, ...zbytek } = z;
  zdroje[z.id] = fotkyZdroj ?? fotky;
  fotekCelkem += zdroje[z.id].length;
  return { ...zbytek, pocetFotek: zdroje[z.id].length };
});

mkdirSync("data", { recursive: true });
writeFileSync("data/fotky-zdroje.json", JSON.stringify(zdroje) + "\n", "utf8");

writeFileSync(CESTA, JSON.stringify({
  verze: 3,
  sebranoDne: db.sebranoDne,
  fotkyZaklad: zaklad,
  inzeraty,
}, null, 2) + "\n", "utf8");

console.log(`Prevedeno ${inzeraty.length} inzeratu, ${fotekCelkem} fotek.`);
console.log(`  zaklad adres: ${zaklad}`);
console.log(`  zdrojove adresy presunuty do data/fotky-zdroje.json`);
