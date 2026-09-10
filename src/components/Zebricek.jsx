import { useEffect, useState } from "react";
import { formatCislo } from "../lib/skore";
import { nactiZebricek, odesliVysledek } from "../lib/zebricek";
import {
  idHrace,
  nactiPrezdivku,
  zapisPrezdivku,
  oznacOdeslano,
  jeOdeslano,
  hostovskeJmeno,
} from "../lib/ulozeni";

// Klouzava okna, ne kalendarni tyden a mesic - zebricek tak nikdy
// nezacina prazdny jen proto, ze zrovna zacalo nove obdobi.
const OBDOBI = [
  ["den", "Dnes"],
  ["tyden", "7 dní"],
  ["mesic", "30 dní"],
];

// jenCteni = hrac dnesni vyzvu nehral, takze nema co zapisovat a vidi
// pouze tabulku.
export default function Zebricek({ datum, body = null, jenCteni = false }) {
  const [prezdivka, setPrezdivka] = useState(() => nactiPrezdivku());
  const [odeslano, setOdeslano] = useState(() => jeOdeslano(datum));
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState(null);
  const [data, setData] = useState(null);
  const [nacitam, setNacitam] = useState(true);
  const [obdobi, setObdobi] = useState("den");
  // Kdo prezdivku nevyplni, zapise se pod tímhle. Ukazujeme to rovnou
  // v poli jako napovedu, at neni prekvapeny, jak se v tabulce jmenuje.
  const [host] = useState(() => hostovskeJmeno());

  async function stahni(kdy = obdobi) {
    setNacitam(true);
    setData(await nactiZebricek(datum, kdy));
    setNacitam(false);
  }

  // Tabulku nacteme hned pri zobrazeni - komponenta se vykresluje az
  // ve chvili, kdy si ji nekdo vyzada.
  useEffect(() => {
    stahni(obdobi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datum, obdobi]);

  async function odesli() {
    const jmeno = prezdivka.trim() || host;
    setOdesilam(true);
    setChyba(null);

    const vysledek = await odesliVysledek({ datum, hrac: idHrace(), prezdivka: jmeno, body });
    setOdesilam(false);

    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      return;
    }
    zapisPrezdivku(jmeno);
    oznacOdeslano(datum);
    setOdeslano(true);
    stahni(obdobi);
  }

  const muzeZapsat = !jenCteni && !odeslano && Number.isFinite(body);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-left">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-bold text-slate-100">
          {{ den: "Žebříček dne", tyden: "Žebříček týdne", mesic: "Žebříček měsíce" }[obdobi]}
        </h3>
        {data && (
          <span className="text-xs text-slate-500">
            {data.pocet} {data.pocet === 1 ? "hráč" : data.pocet < 5 ? "hráči" : "hráčů"}
          </span>
        )}
      </div>

      <div className="mb-3 flex gap-1 rounded-lg bg-slate-900/60 p-1">
        {OBDOBI.map(([id, popisek]) => (
          <button
            key={id}
            onClick={() => setObdobi(id)}
            aria-pressed={obdobi === id}
            className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition ${
              obdobi === id
                ? "bg-slate-700 text-slate-100"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {popisek}
          </button>
        ))}
      </div>

      {muzeZapsat && obdobi === "den" && (
        <div className="mb-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={prezdivka}
              onChange={(e) => setPrezdivka(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && odesli()}
              placeholder={host}
              maxLength={20}
              className="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={odesli}
              disabled={odesilam}
              className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
            >
              {odesilam ? "Odesílám…" : "Zapsat"}
            </button>
          </div>
          {chyba && <p className="text-sm text-rose-400">{chyba}</p>}
        </div>
      )}

      {nacitam && <p className="text-sm text-slate-500">Načítám…</p>}

      {!nacitam && data && data.poradi.length > 0 && (
        <ol className="space-y-1">
          {data.poradi.map((r, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded px-2 py-1 text-sm ${
                i < 3 ? "bg-slate-700/30" : ""
              }`}
            >
              <span className="w-6 shrink-0 text-right tabular-nums text-slate-500">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-slate-200">
                {r.prezdivka}
                {obdobi !== "den" && (
                  <span className="ml-2 text-xs text-slate-500">
                    {r.dnu} {r.dnu === 1 ? "den" : r.dnu < 5 ? "dny" : "dní"}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-100">
                {formatCislo(r.body)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {!nacitam && data && data.poradi.length === 0 && (
        <p className="text-sm text-slate-500">
          {obdobi === "den"
            ? "Dneska zatím nikdo nehrál :("
            : "V tomhle období zatím nikdo nehrál :("}
        </p>
      )}

      {!nacitam && data === null && (
        <p className="text-sm text-slate-500">Žebříček se teď nepodařilo načíst.</p>
      )}
    </div>
  );
}
