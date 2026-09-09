// Fotky mame ve vlastni kopii na R2 pod klici <id>/<poradi>.jpg,
// nahledy maji priponu _n. Adresy se proto neukladaji do dat - odvodi se.

// Transformacni presety CDN Seznamu. Hra je uz nepouziva (fotky jsou nase),
// potrebuje je jen stahovaci skript. Funguji POUZE v techto presnych tvarech;
// jakakoli jina hodnota vraci 400 a strop je 1200 px na delsi strane.
export const PRESETY = {
  nahled: "res,100,100,1|jpg,80",            // ~2 kB
  velka: "res,1200,1200,1|shr,,20|jpg,80",   // ~120 kB, nejvyssi dostupna kvalita
};

// Adresa nasi kopie fotky.
export function fotoUrl(zaklad, id, poradi, velikost = "velka") {
  if (!zaklad) return null;
  const pripona = velikost === "nahled" ? "_n" : "";
  return `${zaklad}/${id}/${poradi}${pripona}.jpg`;
}

// Adresa u Seznamu - jen pro stahovaci skript.
export function zdrojUrl(zdroj, velikost = "velka") {
  const preset = PRESETY[velikost];
  if (!preset) throw new Error(`Neznama velikost fotky: ${velikost}`);
  return `${zdroj}?fl=${preset}`;
}
