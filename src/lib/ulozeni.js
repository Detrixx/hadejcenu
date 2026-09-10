// Ukladani do prohlizece. Vsechno je obalene v try/catch - v anonymnim okne
// nebo pri zakazanych datech muze pristup k uloziste vyhodit vyjimku a hra
// by se tim cela zastavila.

const KLIC = "hadejcenu";

const prazdne = { serie: 0, nejdelsiSerie: 0, posledniDen: null, dny: {} };

export function nacti() {
  try {
    const s = localStorage.getItem(KLIC);
    return s ? { ...prazdne, ...JSON.parse(s) } : { ...prazdne };
  } catch {
    return { ...prazdne };
  }
}

export function zapisStav(stav) {
  try {
    localStorage.setItem(KLIC, JSON.stringify(stav));
  } catch {
    /* bez ulozeni se da hrat dal */
  }
  return stav;
}

function vcerejsek(datum) {
  const [r, m, d] = datum.split("-").map(Number);
  const v = new Date(r, m - 1, d - 1);
  const p = (n) => String(n).padStart(2, "0");
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
}

export const odehranoDnes = (stav, datum) => Boolean(stav.dny[datum]);

export function zapisDenni(datum, body, tipy) {
  const stav = nacti();
  if (stav.dny[datum]) return stav; // jedna hra denne

  // Serie pokracuje jen tehdy, kdyz hral i vcera. Jinak zacina znovu.
  const serie = stav.posledniDen === vcerejsek(datum) ? stav.serie + 1 : 1;

  stav.dny[datum] = { body, tipy };
  stav.posledniDen = datum;
  stav.serie = serie;
  stav.nejdelsiSerie = Math.max(stav.nejdelsiSerie, serie);
  return zapisStav(stav);
}

// Serie plati jen dnes nebo vcera - starsi uz je preruseny.
export function aktualniSerie(stav, datum) {
  if (!stav.posledniDen) return 0;
  if (stav.posledniDen === datum || stav.posledniDen === vcerejsek(datum)) {
    return stav.serie;
  }
  return 0;
}

export function nejlepsiVolna(stav) {
  const body = Object.values(stav.dny).map((d) => d.body);
  return body.length ? Math.max(...body) : 0;
}

// Nahodny identifikator prohlizece. Slouzi k tomu, aby sel do zebricku
// jeden zapis na den - neni to prihlaseni ani nic, co by clovek poznal.
export function idHrace() {
  const stav = nacti();
  if (stav.id) return stav.id;
  const id =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  stav.id = id;
  zapisStav(stav);
  return id;
}

export function nactiPrezdivku() {
  return nacti().prezdivka ?? "";
}

export function zapisPrezdivku(prezdivka) {
  const stav = nacti();
  stav.prezdivka = prezdivka;
  zapisStav(stav);
}

// Poznamena, ze dnesni vysledek uz do zebricku odesel.
export function oznacOdeslano(datum) {
  const stav = nacti();
  stav.odeslano = { ...(stav.odeslano ?? {}), [datum]: true };
  zapisStav(stav);
}

export const jeOdeslano = (datum) => Boolean(nacti().odeslano?.[datum]);

// Nahradni jmeno pro toho, kdo prezdivku nevyplni. Generuje se jednou
// a zustava - tentyz prohlizec tak vystupuje v zebricku pod stejnym
// jmenem i dalsi dny.
export function hostovskeJmeno() {
  const stav = nacti();

  // Drive se jmeno generovalo malym pismenem. Kdo uz nejake ma, dostane
  // stejne cislo s velkym G - jinak by se mu jmeno nezmenilo, dokud by
  // si nevymazal data prohlizece.
  if (stav.host) {
    const opravene = stav.host.replace(/^guest/, "Guest");
    if (opravene !== stav.host) {
      stav.host = opravene;
      zapisStav(stav);
    }
    return opravene;
  }

  const jmeno = "Guest" + Math.floor(1000 + Math.random() * 9000);
  stav.host = jmeno;
  zapisStav(stav);
  return jmeno;
}
