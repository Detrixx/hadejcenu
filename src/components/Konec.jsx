import { formatCena, odchylkaProcent, BODU_ZA_KOLO } from "../lib/skore";
import { usePocitadlo } from "../lib/usePocitadlo";

export default function Konec({ vysledky, onZnovu, onNastaveni }) {
  const celkem = vysledky.reduce((s, v) => s + v.body, 0);
  const maximum = vysledky.length * BODU_ZA_KOLO;
  const podil = Math.round((celkem / maximum) * 100);
  const zobrazenoCelkem = usePocitadlo(celkem, 1200);

  return (
    <div className="najed mx-auto max-w-2xl space-y-8">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
        <div className="text-xs uppercase tracking-wide text-slate-500">Celkem</div>
        <div className="puls mt-2 text-7xl font-bold tabular-nums text-slate-50">
          {zobrazenoCelkem}
        </div>
        <div className="mt-2 text-slate-500">
          z {maximum} bodů · {podil} %
        </div>
      </div>

      <ol className="space-y-2">
        {vysledky.map((v, i) => {
          const odchylka = odchylkaProcent(v.tip, v.inzerat.cena);
          return (
            <li
              key={v.inzerat.id}
              className="najed flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3"
              style={{ animationDelay: `${0.6 + i * 0.08}s` }}
            >
              <span className="w-5 shrink-0 text-slate-600">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <a
                  href={v.inzerat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-medium text-slate-200 underline decoration-slate-700 underline-offset-2 hover:text-white"
                >
                  {v.inzerat.dispozice} · {v.inzerat.obec}
                </a>
                <div className="mt-0.5 text-sm tabular-nums text-slate-500">
                  tip {formatCena(v.tip)} · skutečně {formatCena(v.inzerat.cena)} ·{" "}
                  {odchylka > 0 ? "+" : ""}
                  {odchylka.toFixed(0)} %
                </div>
              </div>
              <span className="shrink-0 text-lg font-bold tabular-nums text-slate-100">
                {v.body}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="space-y-2">
        <button
          onClick={onZnovu}
          className="w-full rounded-lg bg-emerald-500 py-3.5 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
        >
          Hrát znovu
        </button>
        <button
          onClick={onNastaveni}
          className="w-full rounded-lg border border-slate-700 py-3 font-medium text-slate-300 transition hover:border-slate-600 hover:text-slate-100"
        >
          Změnit nastavení
        </button>
      </div>
    </div>
  );
}
