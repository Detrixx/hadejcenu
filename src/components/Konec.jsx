import { useState } from "react";
import { formatCena, odchylkaProcent, BODU_ZA_KOLO } from "../lib/skore";
import { usePocitadlo } from "../lib/usePocitadlo";
import { sestavText, ctverec, sdilej } from "../lib/sdileni";

export default function Konec({
  vysledky,
  onZnovu,
  onNastaveni,
  jeDenni = false,
  serie = 0,
  datum = null,
}) {
  const celkem = vysledky.reduce((s, v) => s + v.body, 0);
  const maximum = vysledky.length * BODU_ZA_KOLO;
  const podil = Math.round((celkem / maximum) * 100);
  const zobrazenoCelkem = usePocitadlo(celkem, 1200);
  const [stavSdileni, setStavSdileni] = useState(null);

  async function sdilet() {
    const vysledek = await sdilej(sestavText({ vysledky, jeDenni, datum, serie }));
    if (vysledek === "zruseno") return;
    setStavSdileni(vysledek);
    setTimeout(() => setStavSdileni(null), 2500);
  }

  const popisTlacitka = {
    zkopirovano: "Zkopírováno do schránky",
    sdileno: "Sdíleno",
    chyba: "Nepodařilo se zkopírovat",
  }[stavSdileni];

  return (
    <div className="najed mx-auto max-w-2xl space-y-8">
      <div
        className={`rounded-2xl border p-8 text-center ${
          jeDenni ? "border-indigo-500/60 bg-indigo-500/10" : "border-slate-700 bg-slate-800/50"
        }`}
      >
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {jeDenni ? "Denní výzva" : "Celkem"}
        </div>
        <div className="puls mt-2 text-7xl font-bold tabular-nums text-slate-50">
          {zobrazenoCelkem}
        </div>
        <div className="mt-2 text-slate-500">
          z {maximum} bodů · {podil} %
        </div>

        {jeDenni && serie > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-500/50 bg-indigo-950/40 px-4 py-2">
            <span className="text-xl font-bold tabular-nums text-indigo-200">{serie}</span>
            <span className="text-sm text-indigo-300/80">
              {serie === 1 ? "den v řadě" : serie < 5 ? "dny v řadě" : "dní v řadě"}
            </span>
          </div>
        )}

        <div className="mt-5 text-2xl tracking-widest" aria-hidden="true">
          {vysledky.map((v, i) => (
            <span key={i}>{ctverec(v.body)}</span>
          ))}
        </div>

        <button
          onClick={sdilet}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-5 py-2.5 font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          {popisTlacitka ?? "Sdílet výsledek"}
        </button>
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
        {jeDenni ? (
          <p className="rounded-lg border border-slate-700 bg-slate-800/40 py-3 text-center text-sm text-slate-400">
            Další výzva bude zítra. Zatím si zahraj běžnou hru.
          </p>
        ) : (
        <button
          onClick={onZnovu}
          className="w-full rounded-lg bg-emerald-500 py-3.5 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
        >
          Hrát znovu
        </button>
        )}
        <button
          onClick={onNastaveni}
          className="w-full rounded-lg border border-slate-700 py-3 font-medium text-slate-300 transition hover:border-slate-600 hover:text-slate-100"
        >
          {jeDenni ? "Zpět na úvod" : "Změnit nastavení"}
        </button>
      </div>
    </div>
  );
}
