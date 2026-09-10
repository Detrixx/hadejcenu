import data from "../data/inzeraty.json" with { type: "json" };

export const POCET_KOL = 5;
export const FOTKY_ZAKLAD = data.fotkyZaklad ?? null;
const KROK = 10_000;

export const MIN_CENA = 200_000;
export const MAX_CENA = 60_000_000;
export const VYCHOZI_TIP = 4_000_000;

// Rozsah je pevny, takze po pristim sberu muze prijit inzerat, ktery se do
// nej nevejde - a ten by nesel trefit. Radeji na to upozornime pri vyvoji,
// nez aby to hrac objevil sam.
if (import.meta.env?.DEV) {
  const mimo = data.inzeraty.filter((z) => z.cena < MIN_CENA || z.cena > MAX_CENA);
  if (mimo.length) {
    console.warn(
      `[hra] ${mimo.length} inzeratu je mimo rozsah slideru (${MIN_CENA}-${MAX_CENA}) a nelze je trefit:`,
      mimo.map((z) => `${z.id}: ${z.cena}`)
    );
  }
}

function zamichej(pole) {
  const a = [...pole];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dostupneKraje() {
  return [...new Set(data.inzeraty.map((z) => z.kraj))].sort((a, b) =>
    a.localeCompare(b, "cs")
  );
}

// Hranice jsou zvolene podle skutecneho rozlozeni cen v datech, ne od oka:
// nad 10 mil. lezi zhruba petina nabidky, do 3 mil. zhruba osmina. Obojí
// necha dost inzeratu na to, aby se hra neopakovala.
export const REZIMY = [
  { id: "klasika", popisek: "Klasika", popis: "Všechny nemovitosti" },
  { id: "luxus", popisek: "Luxus", popis: "Od 10 mil.", min: 10_000_000 },
  { id: "brloh", popisek: "Brloh", popis: "Do 3 mil.", max: 3_000_000 },
  { id: "hardcore", popisek: "Hardcore", popis: "Bez mapy", mapa: false },
];

const rezimPodleId = (id) => REZIMY.find((r) => r.id === id) ?? REZIMY[0];

// Rezimy krome Hardcore mapu ukazuji.
export const maMapu = (rezimId) => rezimPodleId(rezimId).mapa !== false;

function filtruj({ typ = null, kraj = null, rezim = "klasika" } = {}) {
  const r = rezimPodleId(rezim);
  return data.inzeraty.filter(
    (z) =>
      (!typ || z.typ === typ) &&
      (!kraj || z.kraj === kraj) &&
      (!r.min || z.cena >= r.min) &&
      (!r.max || z.cena <= r.max)
  );
}

export function spocitejNabidku(volby = {}) {
  return filtruj(volby).length;
}

// Vraci nahodna kola bez opakovani. Kdyz filtr nestaci na POCET_KOL,
// vrati mene - volajici si pocet zkontroluje.
export function vyberKola({ pocet = POCET_KOL, ...volby } = {}) {
  const zdroj = filtruj(volby);
  return zamichej(zdroj).slice(0, Math.min(pocet, zdroj.length));
}

// V rezimu Luxus nema smysl nechat hrace tipnout 300 tisic a v Brlohu
// 40 milionu - slider proto konci tam, kde konci rezim.
export function rozsahRezimu(rezimId) {
  const r = rezimPodleId(rezimId);
  return { min: r.min ?? MIN_CENA, max: r.max ?? MAX_CENA };
}

// Vychozi tip musi lezet v rozsahu rezimu. Kdyz se do nej 4 miliony
// nevejdou, vezmeme geometricky stred - na logaritmickem slideru je to
// presny prostredek, takze hrac zacina stejne daleko od oba konce.
export function vychoziTip(rezimId) {
  const { min, max } = rozsahRezimu(rezimId);
  if (VYCHOZI_TIP >= min && VYCHOZI_TIP <= max) return VYCHOZI_TIP;
  return Math.round(Math.exp((Math.log(min) + Math.log(max)) / 2) / KROK) * KROK;
}

// Slider je logaritmicky: krok u dvoumilionoveho bytu ma byt jemnejsi
// nez u dvacetimilionove vily. Linearni slider by levne nemovitosti
// zmackl do nekolika pixelu.
export function poziceNaCenu(t, min = MIN_CENA, max = MAX_CENA) {
  const cena = Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min)));
  return Math.round(cena / KROK) * KROK;
}

export function cenaNaPozici(cena, min = MIN_CENA, max = MAX_CENA) {
  const omezena = Math.min(Math.max(cena, min), max);
  return (Math.log(omezena) - Math.log(min)) / (Math.log(max) - Math.log(min));
}
