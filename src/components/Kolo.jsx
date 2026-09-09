import { useEffect, useRef, useState } from "react";
import { poziceNaCenu, cenaNaPozici, rozsahRezimu, vychoziTip } from "../lib/hra";
import { formatCena, formatCislo } from "../lib/skore";
import Galerie from "./Galerie";
import Parametry from "./Parametry";

const KROKU = 1000;

export default function Kolo({ inzerat, rezim = "klasika", vyprselo = false, onTip }) {
  const { min: MIN, max: MAX } = rozsahRezimu(rezim);
  const [tip, setTip] = useState(() => vychoziTip(rezim));
  // Dokud uzivatel pise, drzime jeho text presne tak, jak ho napsal.
  // Kdybychom hodnotu formatovali a orezavali uz pri kazdem stisku klavesy,
  // nesla by cena vubec napsat - "5" by hned skocilo na minimum.
  const [rozepsano, setRozepsano] = useState(null);

  const posun = (e) => {
    setRozepsano(null);
    setTip(poziceNaCenu(Number(e.target.value) / KROKU, MIN, MAX));
  };

  const napsano = (e) => {
    const text = e.target.value;
    setRozepsano(text);
    const cislo = Number(text.replace(/[\s ]/g, ""));
    if (Number.isFinite(cislo) && cislo > 0) setTip(cislo);
  };

  const dopsano = () => {
    setTip((t) => Math.min(Math.max(t, MIN), MAX));
    setRozepsano(null);
  };

  // Kdyz vyprsi cas, odesle se tip tak, jak je prave nastaveny. Pripsat
  // nulu by bylo tvrdsi, nez je nutne - hrac uz nejakou hodnotu zvolil.
  const odeslano = useRef(false);
  useEffect(() => {
    if (vyprselo && !odeslano.current) {
      odeslano.current = true;
      onTip(tip);
    }
  }, [vyprselo, tip, onTip]);

  const misto = [inzerat.obec, inzerat.castObce].filter(Boolean).join(" – ");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <Galerie inzerat={inzerat} />

      <div className="najed space-y-5 self-start lg:sticky lg:top-8">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          <div className="text-xl font-bold text-slate-50">
            {inzerat.typ === "byt" ? "Byt" : "Dům"} {inzerat.dispozice}
          </div>
          <div className="mt-0.5 text-slate-400">{inzerat.plochaM2} m²</div>

          <div className="mt-4 space-y-2 border-t border-slate-700 pt-4">
            <div className="font-medium text-slate-200">{misto}</div>
            <div className="inline-flex items-center gap-1.5 rounded-md border border-sky-800/60 bg-sky-950/40 px-2.5 py-1 text-sm font-semibold text-sky-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {inzerat.kraj}
            </div>
          </div>

          <Parametry inzerat={inzerat} />
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Tvůj tip</div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-slate-50">
              {formatCena(tip)}
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={KROKU}
            value={Math.round(cenaNaPozici(tip, MIN, MAX) * KROKU)}
            onChange={posun}
            aria-label="Odhad ceny"
            className="w-full accent-emerald-400"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{formatCena(MIN)}</span>
            <span>{formatCena(MAX)}</span>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-400">
            <span className="shrink-0">nebo přesně:</span>
            <input
              type="text"
              inputMode="numeric"
              value={rozepsano ?? formatCislo(tip)}
              onChange={napsano}
              onBlur={dopsano}
              className="w-full min-w-0 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-right tabular-nums text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
            <span className="shrink-0">Kč</span>
          </label>
        </div>

        <button
          onClick={() => { odeslano.current = true; onTip(tip); }}
          className="w-full rounded-lg bg-emerald-500 py-3.5 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
        >
          Hádám
        </button>
      </div>
    </div>
  );
}
