import { BODU_ZA_KOLO, formatCislo } from "./skore.js";
import { popisDatumu } from "./denni.js";

// Kazde kolo je jeden ctverec. Barvy jdou od nejlepsiho k nejhorsimu, aby
// se rada dala precist na prvni pohled i bez cisel.
export function ctverec(body) {
  if (body >= 900) return "🟩";
  if (body >= 700) return "🟨";
  if (body >= 450) return "🟧";
  if (body >= 200) return "🟥";
  return "⬛";
}

export function sestavText({ vysledky, jeDenni = false, datum = null, serie = 0 }) {
  const celkem = vysledky.reduce((s, v) => s + v.body, 0);
  const maximum = vysledky.length * BODU_ZA_KOLO;

  const radky = [
    jeDenni && datum ? `hadejcenu.cz · Denní výzva ${popisDatumu(datum)}` : "hadejcenu.cz",
    `${formatCislo(celkem)} / ${formatCislo(maximum)} bodů` +
      (jeDenni && serie > 1 ? ` · série ${serie} 🔥` : ""),
    "",
    vysledky.map((v) => ctverec(v.body)).join(""),
    "",
    "https://hadejcenu.cz",
  ];

  return radky.join("\n");
}

// Na mobilu nabidneme systemove sdileni, jinak schranku. Starsi prohlizece
// a stranky bez HTTPS nemaji navigator.clipboard, proto je pod tim jeste
// zaloha pres docasne textove pole.
export async function sdilej(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "sdileno";
    } catch (e) {
      // Uzivatel sdileni zrusil - nema smysl mu pak jeste neco kopirovat.
      if (e?.name === "AbortError") return "zruseno";
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "zkopirovano";
  } catch {
    /* zkusime zalozni cestu */
  }

  try {
    const pole = document.createElement("textarea");
    pole.value = text;
    pole.setAttribute("readonly", "");
    pole.style.position = "fixed";
    pole.style.opacity = "0";
    document.body.appendChild(pole);
    pole.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(pole);
    return ok ? "zkopirovano" : "chyba";
  } catch {
    return "chyba";
  }
}
