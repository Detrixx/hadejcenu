import { useEffect, useRef, useState } from "react";
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
  const [prezdivka, setPrezdivka] = useState("");
  const [zapsano, setZapsano] = useState(() => jeOdeslano(datum));
  const [jmenoVTabulce, setJmenoVTabulce] = useState(() => nactiPrezdivku());
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState(null);
  const [data, setData] = useState(null);
  const [nacitam, setNacitam] = useState(true);
  const [obdobi, setObdobi] = useState("den");

  const muzeZapsat = !jenCteni && Number.isFinite(body);

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

  // Vysledek se zapisuje sam, bez klikani. Kdo uz nekdy prezdivku zadal,
  // zapise se pod ni; ostatni pod nahradnim jmenem, ktere si pak muzou
  // prepsat. Ref hlida, aby se pri opakovanem vykresleni neodesilalo dvakrat.
  const zapisujeSe = useRef(false);
  useEffect(() => {
    if (!muzeZapsat || zapsano || zapisujeSe.current) return;
    zapisujeSe.current = true;

    (async () => {
      const jmeno = nactiPrezdivku() || hostovskeJmeno();
      const vysledek = await odesliVysledek({ datum, hrac: idHrace(), prezdivka: jmeno, body });
      if (!vysledek.ok) {
        setChyba(vysledek.chyba);
        zapisujeSe.current = false;
        return;
      }
      oznacOdeslano(datum);
      setZapsano(true);
      setJmenoVTabulce(jmeno);
      stahni("den");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muzeZapsat, zapsano, datum, body]);

  // Prejmenovani. Server pri druhem zapisu meni jen jmeno, skore zustava.
  async function prejmenuj() {
    const jmeno = prezdivka.trim();
    if (!jmeno) return;
    setOdesilam(true);
    setChyba(null);

    const vysledek = await odesliVysledek({ datum, hrac: idHrace(), prezdivka: jmeno, body });
    setOdesilam(false);

    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      return;
    }
    zapisPrezdivku(jmeno);
    setJmenoVTabulce(jmeno);
    setPrezdivka("");
    stahni(obdobi);
  }

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
        <div className="mb-3 space-y-2 rounded-lg bg-slate-900/40 p-3">
          <p className="text-sm text-slate-400">
            {zapsano ? (
              <>
                Zapsáno jako{" "}
                <span className="font-semibold text-slate-200">{jmenoVTabulce}</span>. Chceš jiné
                jméno?
              </>
            ) : (
              "Zapisuji výsledek…"
            )}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={prezdivka}
              onChange={(e) => setPrezdivka(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && prejmenuj()}
              placeholder="Tvoje přezdívka"
              maxLength={20}
              className="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={prejmenuj}
              disabled={!prezdivka.trim() || odesilam || !zapsano}
              className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
            >
              {odesilam ? "Ukládám…" : "Uložit"}
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
                r.prezdivka === jmenoVTabulce
                  ? "bg-emerald-500/10 ring-1 ring-emerald-500/40"
                  : i < 3
                    ? "bg-slate-700/30"
                    : ""
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
