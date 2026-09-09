import { formatCena, odchylkaProcent, hodnoceni } from "../lib/skore";
import { usePocitadlo } from "../lib/usePocitadlo";
import Galerie from "./Galerie";

export default function Odhaleni({ inzerat, tip, body, posledni, onDalsi }) {
  const odchylka = odchylkaProcent(tip, inzerat.cena);
  const { text, barva } = hodnoceni(body);
  const smer = odchylka > 0 ? "nad cenou" : "pod cenou";
  const zobrazeneBody = usePocitadlo(body, 900);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <Galerie inzerat={inzerat} />

      <div className="najed space-y-5 self-start lg:sticky lg:top-8">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 text-center">
          <div className={`text-sm font-bold uppercase tracking-wide ${barva}`}>{text}</div>
          <div className="puls mt-1 text-6xl font-bold tabular-nums text-slate-50">
            {zobrazeneBody}
          </div>
          <div className="text-slate-500">z 1000 bodů</div>
        </div>

        <div className="space-y-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Tvůj tip</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-200">
              {formatCena(tip)}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4">
            <div className="text-xs uppercase tracking-wide text-emerald-500/80">
              Skutečná cena
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">
              {formatCena(inzerat.cena)}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400">
          Byl jsi{" "}
          <span className="font-bold text-slate-100">{Math.abs(odchylka).toFixed(0)} %</span>{" "}
          {smer}.
        </p>

        <div className="text-center">
          <a
            href={inzerat.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200"
          >
            Zobrazit původní inzerát na Sreality.cz
          </a>
        </div>

        <button
          onClick={onDalsi}
          className="w-full rounded-lg bg-slate-100 py-3.5 text-lg font-semibold text-slate-900 transition hover:bg-white active:scale-[0.98]"
        >
          {posledni ? "Zobrazit výsledek" : "Další kolo"}
        </button>
      </div>
    </div>
  );
}
