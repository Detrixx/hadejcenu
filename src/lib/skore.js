// Skore se pocita z POMERU tipu a skutecne ceny, ne z rozdilu v korunach.
// Diky tomu je stejne tezke trefit garsonku za 1,5 M i barak za 30 M
// a tip dvojnasobny je stejna chyba jako tip poloviccni.
const STRMOST = 3;
export const BODU_ZA_KOLO = 1000;

export function spocitejBody(tip, cena) {
  if (!tip || !cena || tip <= 0 || cena <= 0) return 0;
  const odchylka = Math.abs(Math.log(tip / cena));
  return Math.round(BODU_ZA_KOLO * Math.exp(-STRMOST * odchylka));
}

// Zaporne = tip byl pod cenou, kladne = nad ni.
export function odchylkaProcent(tip, cena) {
  return ((tip - cena) / cena) * 100;
}

export function hodnoceni(body) {
  if (body >= 900) return { text: "Trefa!", barva: "text-emerald-400" };
  if (body >= 700) return { text: "Velmi blízko", barva: "text-emerald-400" };
  if (body >= 450) return { text: "Ujde to", barva: "text-amber-400" };
  if (body >= 200) return { text: "Dost vedle", barva: "text-orange-400" };
  return { text: "Úplně mimo", barva: "text-rose-400" };
}

const czk = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});

export const formatCena = (x) => czk.format(x);
export const formatCislo = (x) => new Intl.NumberFormat("cs-CZ").format(x);
