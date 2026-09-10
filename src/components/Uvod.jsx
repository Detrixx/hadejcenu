import { useEffect, useRef, useState } from "react";
import { dostupneKraje, spocitejNabidku, POCET_KOL, REZIMY } from "../lib/hra";
import DenniVyzva from "./DenniVyzva";

// Ukazka nastaveni se prehraje jen jednou za nacteni stranky. Bez toho by
// se opakovala pokazde, kdyz se hrac vrati z hry na uvod, a to uz otravuje.
let ukazkaProbehla = false;

const omezenyPohyb = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

// Neomezeny cas je schvalne az za nejdelsim limitem, aby slider sel
// zleva doprava od nejtvrdsiho k nejmirnejsimu.
const CASY = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300, 0];

function popisCasu(s) {
  if (s === 0) return "Neomezeně";
  if (s < 60) return `${s} s`;
  if (s % 60 === 0) return `${s / 60} min`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Kazdy rezim ma vlastni barvu a znak, aby slo poznat, ze menim neco
// jineho nez typ nemovitosti.
const BARVY = {
  klasika: "border-emerald-400 bg-emerald-500/10 text-emerald-300",
  luxus: "border-amber-400 bg-amber-500/10 text-amber-300",
  brloh: "border-orange-500 bg-orange-500/10 text-orange-300",
  hardcore: "border-rose-500 bg-rose-500/10 text-rose-300",
};

const ZNAKY = { klasika: "🏘️", luxus: "💎", brloh: "🏚️", hardcore: "🔥" };

const TYPY = [
  { hodnota: null, popisek: "Vše", ikona: IkonaVse },
  { hodnota: "byt", popisek: "Byty", ikona: IkonaByt },
  { hodnota: "dum", popisek: "Domy", ikona: IkonaDum },
];

export default function Uvod({ nastaveni, onStart, denni }) {
  const [typ, setTyp] = useState(nastaveni.typ);
  const [kraj, setKraj] = useState(nastaveni.kraj);
  const [rezim, setRezim] = useState(nastaveni.rezim ?? "klasika");
  const [casIndex, setCasIndex] = useState(() => {
    const i = CASY.indexOf(nastaveni.cas);
    return i >= 0 ? i : CASY.indexOf(60);
  });
  // Pri prvnim prichodu je nastaveni rozbalene, aby bylo videt, co se da
  // menit. Po chvili se slozi a stranka tim vyjede nahoru. Pak uz zustava
  // slozene, aby se tlacitko "Zacit hru" veslo na obrazovku bez rolovani.
  const [otevreno, setOtevreno] = useState(() => !ukazkaProbehla && !omezenyPohyb());

  // Jakmile uzivatel klikne sam, ukazku prerusime - jinak by mu panel
  // zavrela pod rukama, treba zrovna kdyz vybira kraj.
  const sahlNaTo = useRef(false);

  useEffect(() => {
    if (ukazkaProbehla) return;
    if (omezenyPohyb()) {
      ukazkaProbehla = true;
      return;
    }

    const zavrit = setTimeout(() => {
      // Priznak nastavujeme az tady, ne na zacatku efektu. React ve vyvoji
      // komponentu pripoji dvakrat a mezitim efekt uklidi - kdyby se priznak
      // nastavil hned, druhe pripojeni by ukazku preskocilo a nic by se
      // nestalo.
      ukazkaProbehla = true;
      if (!sahlNaTo.current) setOtevreno(false);
    }, 1800);
    return () => clearTimeout(zavrit);
  }, []);

  function prepniNastaveni() {
    sahlNaTo.current = true;
    setOtevreno((o) => !o);
  }

  const cas = CASY[casIndex];
  const kraje = dostupneKraje();
  const nabidka = spocitejNabidku({ typ, kraj, rezim });
  const malo = nabidka > 0 && nabidka < POCET_KOL;

  const souhrn = [
    REZIMY.find((r) => r.id === rezim)?.popisek,
    TYPY.find((t) => t.hodnota === typ)?.popisek,
    kraj ?? "Všechny kraje",
    popisCasu(cas),
  ].join(" · ");

  return (
    <div className="najed relative mx-auto max-w-xl py-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-10 h-48 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.18),transparent_65%)] blur-2xl"
      />

      <div className="relative space-y-4">
        <div className="text-center">
          <h2 className="bg-gradient-to-br from-white via-emerald-100 to-emerald-400 bg-clip-text pb-1.5 text-5xl font-extrabold leading-[1.15] tracking-tight text-transparent">
            Hádej cenu
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Prohlédni si fotky nemovitosti a zkus odhadnout, za kolik se prodává.
          </p>
        </div>

        <DenniVyzva {...denni} />

        <div className="rounded-xl border-2 border-slate-700 bg-slate-800/40">
          <button
            onClick={prepniNastaveni}
            aria-expanded={otevreno}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-700/20"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vlastní hra
              </div>
              <div className="truncate text-sm text-slate-300">{souhrn}</div>
            </div>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
              className={`shrink-0 text-slate-500 transition-transform ${otevreno ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Vyska se animuje pres grid-rows 0fr -> 1fr. Je to jediny zpusob,
              jak plynule rozbalit obsah, jehoz vysku dopredu neznam - max-height
              by se muselo hadat a pri spatnem odhadu by to cuklo. */}
          <div
            className={`grid transition-[grid-template-rows] duration-700 ease-in-out ${
              otevreno ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 border-t border-slate-700 px-4 pb-4 pt-4">
              <Sekce popis="Režim">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {REZIMY.map((r) => {
                    const vybrano = rezim === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setRezim(r.id)}
                        aria-pressed={vybrano}
                        className={`rounded-lg border-2 px-1 py-2 text-center transition ${
                          vybrano
                            ? BARVY[r.id]
                            : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <div className="text-lg leading-none">{ZNAKY[r.id]}</div>
                        <div className="mt-1 text-sm font-bold">{r.popisek}</div>
                        <div className="text-[0.7rem] opacity-70">{r.popis}</div>
                      </button>
                    );
                  })}
                </div>
              </Sekce>

              <Sekce popis="Co budeš hádat">
                <div className="grid grid-cols-3 gap-2">
                  {TYPY.map(({ hodnota, popisek, ikona: Ikona }) => {
                    const vybrano = typ === hodnota;
                    return (
                      <button
                        key={popisek}
                        onClick={() => setTyp(hodnota)}
                        aria-pressed={vybrano}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 transition ${
                          vybrano
                            ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                            : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <Ikona />
                        <span className="text-sm font-semibold">{popisek}</span>
                      </button>
                    );
                  })}
                </div>
              </Sekce>

              <Sekce popis="Kraj">
                <select
                  value={kraj ?? ""}
                  onChange={(e) => setKraj(e.target.value || null)}
                  className="w-full rounded-lg border-2 border-slate-700 bg-slate-900 px-3 py-2 font-medium text-slate-100 transition hover:border-slate-600 focus:border-emerald-400 focus:outline-none"
                >
                  <option value="">Všechny kraje</option>
                  {kraje.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Sekce>

              <Sekce
                popis="Čas na kolo"
                vpravo={
                  <span
                    className={`font-bold tabular-nums ${cas === 0 ? "text-sky-300" : "text-emerald-300"}`}
                  >
                    {popisCasu(cas)}
                  </span>
                }
              >
                <input
                  type="range"
                  min={0}
                  max={CASY.length - 1}
                  step={1}
                  value={casIndex}
                  onChange={(e) => setCasIndex(Number(e.target.value))}
                  aria-label="Čas na kolo"
                  aria-valuetext={popisCasu(cas)}
                  className="w-full accent-emerald-400"
                />
              </Sekce>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-center text-xs text-slate-500">
            {nabidka === 0
              ? "Pro tento výběr nemáme žádný inzerát."
              : `K dispozici ${nabidka} ${nabidka === 1 ? "inzerát" : nabidka < 5 ? "inzeráty" : "inzerátů"}.`}
            {malo && ` Zahraješ si jen ${nabidka} ${nabidka === 1 ? "kolo" : "kola"} místo ${POCET_KOL}.`}
          </p>

          <button
            onClick={() => onStart({ typ, kraj, cas, rezim })}
            disabled={nabidka === 0}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 py-3 text-lg font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-emerald-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:shadow-none"
          >
            Začít hru
          </button>
        </div>
      </div>
    </div>
  );
}

function Sekce({ popis, vpravo, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{popis}</span>
        {vpravo}
      </div>
      {children}
    </div>
  );
}

const svg = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function IkonaByt() {
  return (
    <svg {...svg}>
      <rect x="4" y="2.5" width="16" height="19" rx="1.5" />
      <path d="M8.5 6.5h1M14.5 6.5h1M8.5 10.5h1M14.5 10.5h1M8.5 14.5h1M14.5 14.5h1" />
      <path d="M10 21.5v-3.5h4v3.5" />
    </svg>
  );
}

function IkonaDum() {
  return (
    <svg {...svg}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9v12.5h13V9" />
      <path d="M10 21.5V15h4v6.5" />
    </svg>
  );
}

function IkonaVse() {
  return (
    <svg {...svg}>
      <path d="M2.5 12 7 8l4.5 4" />
      <path d="M4 11v10.5h6V11" />
      <rect x="13" y="5.5" width="8.5" height="16" rx="1" />
      <path d="M16 9h1M19 9h1M16 13h1M19 13h1" />
    </svg>
  );
}
