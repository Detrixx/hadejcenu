import { useState } from "react";
import { vyberKola } from "./lib/hra";
import { spocitejBody } from "./lib/skore";
import { usePocitadlo } from "./lib/usePocitadlo";
import Uvod from "./components/Uvod";
import Kolo from "./components/Kolo";
import Odhaleni from "./components/Odhaleni";
import Konec from "./components/Konec";
import Casomira from "./components/Casomira";

const VYCHOZI_NASTAVENI = { typ: null, kraj: null, cas: 60, rezim: "klasika" };

export default function App() {
  const [faze, setFaze] = useState("uvod");
  const [nastaveni, setNastaveni] = useState(VYCHOZI_NASTAVENI);
  const [kola, setKola] = useState([]);
  const [index, setIndex] = useState(0);
  const [odhaleno, setOdhaleno] = useState(null);
  const [vyprselo, setVyprselo] = useState(false);
  const [vysledky, setVysledky] = useState([]);

  const inzerat = kola[index];
  const konec = faze === "hra" && index >= kola.length;
  const prubeznePody = vysledky.reduce((s, v) => s + v.body, 0);
  const zobrazenePody = usePocitadlo(prubeznePody, 700);

  function start(volby) {
    setNastaveni(volby);
    setKola(vyberKola(volby));
    setIndex(0);
    setOdhaleno(null);
    setVyprselo(false);
    setVysledky([]);
    setFaze("hra");
  }

  function hadej(tip) {
    const body = spocitejBody(tip, inzerat.cena);
    setOdhaleno({ tip, body });
    setVysledky((p) => [...p, { inzerat, tip, body }]);
  }

  function dalsi() {
    setOdhaleno(null);
    setVyprselo(false);
    setIndex((i) => i + 1);
  }

  const hraje = faze === "hra" && !konec && inzerat;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto w-full max-w-[min(95rem,calc((100vh-11rem)*4/3+23.5rem))] px-4 py-6 sm:px-6">
        <header className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">hadejcenu.cz</h1>

          <div className="justify-self-center">
            {hraje && !odhaleno && (
              <Casomira
                key={index}
                delka={nastaveni.cas}
                onVyprselo={() => setVyprselo(true)}
              />
            )}
          </div>

          <div className="justify-self-end">
            {faze === "hra" && !konec && (
              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Kolo </span>
                  <span className="text-lg font-bold tabular-nums text-slate-100">{index + 1}</span>
                  <span className="text-lg text-slate-600"> / {kola.length}</span>
                </div>
                <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-4 py-2">
                  <span className="text-xs uppercase tracking-wide text-emerald-500/80">Body </span>
                  <span className="text-lg font-bold tabular-nums text-emerald-300">
                    {zobrazenePody}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {faze === "uvod" ? (
          <Uvod nastaveni={nastaveni} onStart={start} />
        ) : konec ? (
          <Konec
            vysledky={vysledky}
            onZnovu={() => start(nastaveni)}
            onNastaveni={() => setFaze("uvod")}
          />
        ) : odhaleno ? (
          <Odhaleni
            inzerat={inzerat}
            tip={odhaleno.tip}
            body={odhaleno.body}
            posledni={index === kola.length - 1}
            onDalsi={dalsi}
          />
        ) : (
          <Kolo
            key={inzerat.id}
            inzerat={inzerat}
            rezim={nastaveni.rezim}
            vyprselo={vyprselo}
            onTip={hadej}
          />
        )}
      </div>
    </div>
  );
}
