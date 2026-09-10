import { useEffect, useRef, useState } from "react";
import { poziceNaCenu, cenaNaPozici, rozsahRezimu, vychoziTip, maMapu } from "../lib/hra";
import { formatCena, formatCislo } from "../lib/skore";
import Galerie from "./Galerie";
import Parametry from "./Parametry";
import Mapa from "./Mapa";

const KROKU = 1000;

export default function Kolo({ inzerat, rezim = "klasika", vyprselo = false, onTip }) {
  const { min: MIN, max: MAX } = rozsahRezimu(rezim);
  const [tip, setTip] = useState(() => vychoziTip(rezim));
  // Dokud uzivatel pise, drzime jeho text presne tak, jak ho napsal.
  // Kdybychom hodnotu formatovali a orezavali uz pri kazdem stisku klavesy,
  // nesla by cena vubec napsat - "5" by hned skocilo na minimum.
  const [rozepsano, setRozepsano] = useState(null);

  // Poloha slideru je vlastni stav, ne dopocet z ceny. Kdyby se pocitala
  // zpetne, zaokrouhleni ceny by ji pri tazeni vracelo o kousek zpatky
  // a posuvnik by se v Chromu choval, jako by zamrzl.
  const [pozice, setPozice] = useState(() =>
    Math.round(cenaNaPozici(vychoziTip(rezim), MIN, MAX) * KROKU)
  );

  const posun = (e) => {
    const p = Number(e.target.value);
    setRozepsano(null);
    setPozice(p);
    setTip(poziceNaCenu(p / KROKU, MIN, MAX));
  };

  const napsano = (e) => {
    const text = e.target.value;
    setRozepsano(text);
    const cislo = Number(text.replace(/[\s ]/g, ""));
    if (Number.isFinite(cislo) && cislo > 0) {
      setTip(cislo);
      setPozice(Math.round(cenaNaPozici(cislo, MIN, MAX) * KROKU));
    }
  };

  const dopsano = () => {
    const srovnany = Math.min(Math.max(tip, MIN), MAX);
    setTip(srovnany);
    setPozice(Math.round(cenaNaPozici(srovnany, MIN, MAX) * KROKU));
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-6">
      <Galerie inzerat={inzerat} />

      {/* Na sirokem monitoru je panel pripnuty vedle fotky a pretece jen karta
          s udaji. Na mobilu se sloupce poskladaji pod sebe, takze by ovladani
          skoncilo az pod fotkou, mapou i parametry - proto se z nej nize stava
          lista u spodni hrany obrazovky.
          7rem = odsazeni stranky + hlavicka s mezerou + rezerva dole. */}
      <div className="najed flex flex-col gap-3 self-start min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-7rem)] lg:gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <div className="text-lg font-bold text-slate-50 sm:text-xl">
            {inzerat.typ === "byt" ? "Byt" : "Dům"} {inzerat.dispozice}
          </div>
          <div className="mt-0.5 text-sm text-slate-400 sm:text-base">{inzerat.plochaM2} m²</div>

          <div className="mt-3 space-y-1.5 border-t border-slate-700 pt-3">
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

        {maMapu(rezim) && inzerat.lat != null && inzerat.lon != null && (
          <div className="shrink-0">
            <Mapa lat={inzerat.lat} lon={inzerat.lon} obec={inzerat.obec} />
          </div>
        )}

        {/* Lista s ovladanim. Na mobilu drzi u spodni hrany okna (sticky), aby
            byla fotka i slider videt naraz. Zaporny okraj ji roztahne pres
            odsazeni stranky, at podklad sahá od kraje ke kraji. */}
        <div className="sticky bottom-0 z-30 -mx-4 shrink-0 space-y-1.5 border-t border-slate-800 bg-slate-900/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:mx-0 lg:space-y-2 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          {/* Cislo je zaroven vstupni pole - jeden prvek misto dvou usetri
              na mobilu celou radku a je hned jasne, ze se da prepsat. */}
          <div>
            <label
              htmlFor="tip-cena"
              className="text-xs uppercase tracking-wide text-slate-500"
            >
              Tvůj tip
            </label>
            <div className="flex items-baseline gap-1.5 border-b border-slate-700 focus-within:border-emerald-400">
              <input
                id="tip-cena"
                type="text"
                inputMode="numeric"
                value={rozepsano ?? formatCislo(tip)}
                onChange={napsano}
                onBlur={dopsano}
                className="w-full min-w-0 bg-transparent py-0.5 text-2xl font-bold tabular-nums text-slate-50 focus:outline-none"
              />
              <span className="shrink-0 text-xl font-bold text-slate-400">Kč</span>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={KROKU}
            value={pozice}
            onChange={posun}
            aria-label="Odhad ceny"
            className="w-full accent-emerald-400"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{formatCena(MIN)}</span>
            <span>{formatCena(MAX)}</span>
          </div>

          <button
            onClick={() => {
              odeslano.current = true;
              onTip(tip);
            }}
            className="w-full rounded-lg bg-emerald-500 py-3 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
          >
            Hádám
          </button>
        </div>
      </div>
    </div>
  );
}
