// Komunikace se serverovou casti (Cloudflare Worker + D1).
// Zdrojak Workera je ve slozce server/.

const ADRESA = "https://hadejcenu-zebricek.detrixx.workers.dev";

// Zebricek je doplnek, ne jadro hry - kdyz server nedopovi, hra bezi dal
// a jen se misto tabulky ukaze hlaska. Proto nikde nevyhazujeme vyjimky.

export async function nactiZebricek(datum, obdobi = "den") {
  try {
    const r = await fetch(
      `${ADRESA}/zebricek?datum=${encodeURIComponent(datum)}&obdobi=${encodeURIComponent(obdobi)}`
    );
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function odesliVysledek({ datum, hrac, prezdivka, body }) {
  try {
    const r = await fetch(`${ADRESA}/vysledek`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datum, hrac, prezdivka, body }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      return { ok: false, chyba: data.chyba ?? `Server vrátil ${r.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, chyba: "Server neodpovídá" };
  }
}
