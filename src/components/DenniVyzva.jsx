import { popisDatumu } from "../lib/denni";
import { formatCislo } from "../lib/skore";

// Vstup do denni vyzvy na uvodni obrazovce. Ukazuje, jestli uz je dnesek
// odehrany, a jak dlouhou ma hrac serii.
export default function DenniVyzva({ datum, odehrano, vysledek, serie, onHrat }) {
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

      {odehrano ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-indigo-950/40 px-3 py-2">
          <span className="text-sm text-indigo-200">Dnešek máš odehraný</span>
          <span className="font-bold tabular-nums text-indigo-100">
            {formatCislo(vysledek.body)} b.
          </span>
        </div>
      ) : (
        <button
          onClick={onHrat}
          className="mt-3 w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 active:scale-[0.98]"
        >
          Hrát dnešní výzvu
        </button>
      )}
    </div>
  );
}
