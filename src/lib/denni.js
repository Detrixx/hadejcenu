import data from "../data/inzeraty.json" with { type: "json" };
import { POCET_KOL } from "./hra.js";

// Denni vyzva musi vyjit vsem stejne, takze se nesmi pouzit Math.random.
// Misto toho odvodime nahodnost z data - kazdy prohlizec spocita totez.

function otisk(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Maly generator pseudonahodnych cisel se semenem.
function generator(semeno) {
  let a = semeno >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Datum v mistnim case jako RRRR-MM-DD. Nepouzivame toISOString, ta prevadi
// na UTC a po pulnoci by hrac dostal jeste vcerejsi vyzvu.
export function dnesniDatum(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function popisDatumu(datum) {
  const [r, m, d] = datum.split("-").map(Number);
  return new Date(r, m - 1, d).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Poradi podle id, aby vyber nezavisel na tom, v jakem poradi se inzeraty
// nasbiraly. Pri dalsim sberu se pole stejne zmeni, ale aspon to neposkoci
// pri kazdem preskladani dat.
const serazene = [...data.inzeraty].sort((a, b) => a.id.localeCompare(b.id));

export function denniKola(datum = dnesniDatum()) {
  const nahodne = generator(otisk("hadejcenu-" + datum));
  const zbyva = [...serazene];
  const vybrane = [];
  for (let i = 0; i < POCET_KOL && zbyva.length; i++) {
    const j = Math.floor(nahodne() * zbyva.length);
    vybrane.push(zbyva.splice(j, 1)[0]);
  }
  return vybrane;
}
