import { useEffect, useRef } from "react";
import { formatCena, odchylkaProcent, hodnoceni } from "../lib/skore";
import { usePocitadlo } from "../lib/usePocitadlo";
import { bodyTik, vysledek } from "../lib/zvuky";
import Galerie from "./Galerie";

const NAJEZD_MS = 900;

export default function Odhaleni({ inzerat, tip, body, posledni, onDalsi }) {
  const odchylka = odchylkaProcent(tip, inzerat.cena);
  const { text, barva } = hodnoceni(body);
  const smer = odchylka > 0 ? "nad cenou" : "pod cenou";
  const zobrazeneBody = usePocitadlo(body, NAJEZD_MS);

  // Cvrnkani, jak cislo najizdi. Pocitadlo se meni kazdy snimek, takze
  // bez brzdy by z toho byl sum misto zvuku.
  const posledniTik = useRef(0);
  useEffect(() => {
    if (zobrazeneBody <= 0) return;
    const ted = performance.now();
    if (ted - posledniTik.current < 55) return;
    posledniTik.current = ted;
    bodyTik(zobrazeneBody / 1000);
  }, [zobrazeneBody]);

  // Akord az ve chvili, kdy se cislo zastavi - jinak by se pral s cvrnkanim.
  useEffect(() => {
    const id = setTimeout(() => vysledek(body), NAJEZD_MS);
    return () => clearTimeout(id);
  }, [body]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-6">
      <Galerie inzerat={inzerat} />

      <div className="najed flex flex-col gap-3 self-start min-w-0 lg:sticky lg:top-6 lg:gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center sm:p-5">
          <div className={`text-sm font-bold uppercase tracking-wide ${barva}`}>{text}</div>
          <div className="puls mt-1 text-5xl font-bold tabular-nums text-slate-50 sm:text-6xl">
            {zobrazeneBody}
          </div>
          <div className="text-sm text-slate-500">z 1000 bodů</div>
        </div>

        {/* Na mobilu vedle sebe, aby porovnani cen zabralo jednu radku misto
            dvou karet pod sebou. */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 sm:p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Tvůj tip</div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-slate-200 sm:text-2xl">
              {formatCena(tip)}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3 sm:p-4">
            <div className="text-xs uppercase tracking-wide text-emerald-500/80">
              Skutečná cena
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-emerald-300 sm:text-2xl">
              {formatCena(inzerat.cena)}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-400 sm:text-base">
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

        {/* Stejne jako u hadani: na mobilu pripnute dolu, aby se na dalsi kolo
            neklikalo az po odrolovani pod fotku. */}
        <div className="sticky bottom-0 -mx-4 border-t border-slate-800 bg-slate-900/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <button
            onClick={onDalsi}
            className="w-full rounded-lg bg-slate-100 py-3 text-lg font-semibold text-slate-900 transition hover:bg-white active:scale-[0.98] sm:py-3.5"
          >
            {posledni ? "Zobrazit výsledek" : "Další kolo"}
          </button>
        </div>
      </div>
    </div>
  );
}
