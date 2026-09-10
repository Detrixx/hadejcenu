import { useState } from "react";
import { popisDatumu } from "../lib/denni";
import { formatCislo } from "../lib/skore";
import Zebricek from "./Zebricek";

// Vstup do denni vyzvy na uvodni obrazovce. Ukazuje, jestli uz je dnesek
// odehrany, a jak dlouhou ma hrac serii. Kdyz uz odehrany je, umi rozbalit
// zebricek - jinak by se k nemu po zbytek dne nedalo dostat.
export default function DenniVyzva({ datum, odehrano, vysledek, serie, onHrat }) {
  const [zebricek, setZebricek] = useState(false);

  return (
    <div className="rounded-xl border-2 border-indigo-500/60 bg-indigo-500/10 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-bold text-indigo-200">Denní výzva</div>
          <div className="text-xs text-indigo-300/70">{popisDatumu(datum)}</div>
        </div>
        {serie > 0 && (
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums text-indigo-200">{serie}</div>
            <div className="text-xs text-indigo-300/70">
              {serie === 1 ? "den v řadě" : serie < 5 ? "dny v řadě" : "dní v řadě"}
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-sm text-indigo-100/70">
        Pět stejných nemovitostí pro všechny. Jednou denně.
      </p>

      <div className="mt-3 space-y-2">
        {odehrano ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-indigo-950/40 px-3 py-2">
            <span className="text-sm text-indigo-200">Dnešek máš odehraný</span>
            <span className="font-bold tabular-nums text-indigo-100">
              {formatCislo(vysledek.body)} b.
            </span>
          </div>
        ) : (
          <button
            onClick={onHrat}
            className="w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 active:scale-[0.98]"
          >
            Hrát dnešní výzvu
          </button>
        )}

        {/* Zebricek je dostupny i tomu, kdo dnesni vyzvu jeste nehral -
            jen si ho v tom pripade muze pouze prohlednout. */}
        <button
          onClick={() => setZebricek((z) => !z)}
          aria-expanded={zebricek}
          className="w-full rounded-lg border border-indigo-500/50 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/10"
        >
          {zebricek ? "Skrýt žebříček" : "Zobrazit žebříček"}
        </button>

        {zebricek && (
          <Zebricek
            datum={datum}
            body={odehrano ? vysledek.body : null}
            jenCteni={!odehrano}
          />
        )}
      </div>
    </div>
  );
}
