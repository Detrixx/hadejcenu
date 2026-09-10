// Zebricek denni vyzvy. Dva vstupy:
//   POST /vysledek   { datum, hrac, prezdivka, body }
//   GET  /zebricek?datum=RRRR-MM-DD
//
// Skore se pocita v prohlizeci a sem dorazi hotove, takze podvrhnout ho lze.
// Kontroly nize to jen ztezuji - proti odhodlanemu podvodnikovi by pomohlo
// jedine pocitat kola na serveru, coz by znamenalo prestavet celou hru.

const POVOLENE_ZDROJE = [
  "https://hadejcenu.cz",
  "https://www.hadejcenu.cz",
  "http://localhost:5173",
];

const MAX_BODU = 5000;
const MAX_DELKA_PREZDIVKY = 20;

function hlavicky(request) {
  const zdroj = request.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": POVOLENE_ZDROJE.includes(zdroj) ? zdroj : POVOLENE_ZDROJE[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
}

const odpoved = (request, data, stav = 200) =>
  new Response(JSON.stringify(data), { status: stav, headers: hlavicky(request) });

// Dnesek a vcerejsek podle prazskeho casu - hra je ceska a den ma vsem
// koncit stejne, at je hrac kdekoli.
function dnyVPraze() {
  const ted = new Date();
  const praha = new Date(ted.toLocaleString("en-US", { timeZone: "Europe/Prague" }));
  const p = (n) => String(n).padStart(2, "0");
  const naText = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const vcera = new Date(praha);
  vcera.setDate(vcera.getDate() - 1);
  return [naText(praha), naText(vcera)];
}

function ocistiPrezdivku(text) {
  return String(text ?? "")
    // rizeni radku a neviditelne znaky by rozbily vzhled tabulky
    .replace(/[\p{C}]/gu, "")
    .trim()
    .slice(0, MAX_DELKA_PREZDIVKY);
}

async function ulozVysledek(request, env) {
  let telo;
  try {
    telo = await request.json();
  } catch {
    return odpoved(request, { chyba: "Neplatny obsah" }, 400);
  }

  const { datum, hrac, body } = telo;
  const prezdivka = ocistiPrezdivku(telo.prezdivka);

  if (!prezdivka) return odpoved(request, { chyba: "Chybi prezdivka" }, 400);
  if (typeof hrac !== "string" || hrac.length < 8 || hrac.length > 64) {
    return odpoved(request, { chyba: "Neplatny hrac" }, 400);
  }
  if (!Number.isInteger(body) || body < 0 || body > MAX_BODU) {
    return odpoved(request, { chyba: "Neplatne skore" }, 400);
  }

  // Zapisovat jde jen dnesek a vcerejsek. Bez toho by sel zebricek
  // doplnovat zpetne o libovolna data.
  const [dnes, vcera] = dnyVPraze();
  if (datum !== dnes && datum !== vcera) {
    return odpoved(request, { chyba: "Zapisovat lze jen aktualni vyzvu" }, 400);
  }

  // Vysledek se zapisuje automaticky pod nahradnim jmenem a hrac si ho pak
  // muze prejmenovat. Pri druhem zapisu proto menime jen prezdivku - skore
  // zustava to prvni, aby si ho nikdo nemohl opakovanym odesilanim vylepsit.
  await env.DB.prepare(
    `INSERT INTO vysledky (datum, hrac, prezdivka, body, vytvoreno)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(datum, hrac) DO UPDATE SET prezdivka = excluded.prezdivka`
  )
    .bind(datum, hrac, prezdivka, body, Date.now())
    .run();

  return odpoved(request, { ok: true });
}

const DNU = { den: 1, tyden: 7, mesic: 30 };

function oDniZpet(datum, dnu) {
  const [r, m, d] = datum.split("-").map(Number);
  const cil = new Date(Date.UTC(r, m - 1, d - dnu));
  const p = (n) => String(n).padStart(2, "0");
  return `${cil.getUTCFullYear()}-${p(cil.getUTCMonth() + 1)}-${p(cil.getUTCDate())}`;
}

async function nactiZebricek(request, env, url) {
  const [dnes] = dnyVPraze();
  const datum = url.searchParams.get("datum") ?? dnes;
  const obdobi = url.searchParams.get("obdobi") ?? "den";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return odpoved(request, { chyba: "Neplatne datum" }, 400);
  }
  if (!(obdobi in DNU)) {
    return odpoved(request, { chyba: "Neplatne obdobi" }, 400);
  }

  // Klouzave okno, ne kalendarni tyden - jinak by byl zebricek v pondeli
  // rano prazdny a v nedeli vecer nejzajimavejsi.
  const od = oDniZpet(datum, DNU[obdobi] - 1);

  if (obdobi === "den") {
    const { results } = await env.DB.prepare(
      "SELECT prezdivka, body, 1 AS dnu FROM vysledky WHERE datum = ? ORDER BY body DESC, vytvoreno ASC LIMIT 100"
    )
      .bind(datum)
      .all();
    const pocet = await env.DB.prepare("SELECT COUNT(*) AS n FROM vysledky WHERE datum = ?")
      .bind(datum)
      .first();
    return odpoved(request, { datum, obdobi, od, pocet: pocet?.n ?? 0, poradi: results ?? [] });
  }

  // Za delsi obdobi scitame body a bereme posledni pouzitou prezdivku -
  // hrac si ji mohl mezi dny zmenit.
  const { results } = await env.DB.prepare(
    `SELECT
       (SELECT prezdivka FROM vysledky v2
          WHERE v2.hrac = v.hrac AND v2.datum BETWEEN ? AND ?
          ORDER BY v2.datum DESC LIMIT 1) AS prezdivka,
       SUM(body) AS body,
       COUNT(*)  AS dnu
     FROM vysledky v
     WHERE datum BETWEEN ? AND ?
     GROUP BY hrac
     ORDER BY body DESC, dnu DESC
     LIMIT 100`
  )
    .bind(od, datum, od, datum)
    .all();

  const pocet = await env.DB.prepare(
    "SELECT COUNT(DISTINCT hrac) AS n FROM vysledky WHERE datum BETWEEN ? AND ?"
  )
    .bind(od, datum)
    .first();

  return odpoved(request, { datum, obdobi, od, pocet: pocet?.n ?? 0, poradi: results ?? [] });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: hlavicky(request) });
    }

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/vysledek") {
      return ulozVysledek(request, env);
    }
    if (request.method === "GET" && url.pathname === "/zebricek") {
      return nactiZebricek(request, env, url);
    }

    return odpoved(request, { chyba: "Neznamy pozadavek" }, 404);
  },
};
