import { useState } from "react";
import { vyberKola } from "./lib/hra";
import { spocitejBody } from "./lib/skore";
import { usePocitadlo } from "./lib/usePocitadlo";
import { denniKola, dnesniDatum } from "./lib/denni";
import { nacti, zapisDenni, odehranoDnes, aktualniSerie } from "./lib/ulozeni";
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
  const [jeDenni, setJeDenni] = useState(false);
  const [ulozene, setUlozene] = useState(() => nacti());

  const datum = dnesniDatum();

  const inzerat = kola[index];
  const konec = faze === "hra" && index >= kola.length;
  const prubeznePody = vysledky.reduce((s, v) => s + v.body, 0);
  const zobrazenePody = usePocitadlo(prubeznePody, 700);

  function start(volby) {
    setJeDenni(false);
    setNastaveni(volby);
    setKola(vyberKola(volby));
    setIndex(0);
    setOdhaleno(null);
    setVyprselo(false);
    setVysledky([]);
    setFaze("hra");
  }

  // Denni vyzva ma pevnou peticti a neomezeny cas - filtry se na ni nevztahuji,
  // protoze jejim smyslem je, aby vsichni hrali totez.
  function startDenni() {
    setKola(denniKola(datum));
    setIndex(0);
    setOdhaleno(null);
    setVyprselo(false);
    setVysledky([]);
    setJeDenni(true);
    setFaze("hra");
  }

  function hadej(tip) {
    const body = spocitejBody(tip, inzerat.cena);
    setOdhaleno({ tip, body });
    setVysledky((p) => [...p, { inzerat, tip, body }]);
  }

  function dalsi() {
    const posledni = index === kola.length - 1;
    if (posledni && jeDenni) {
      const body = vysledky.reduce((sc, v) => sc + v.body, 0);
      setUlozene(zapisDenni(datum, body, vysledky.map((v) => v.tip)));
    }
    setOdhaleno(null);
    setVyprselo(false);
    setIndex((i) => i + 1);
  }

  // Kliknuti na nazev v hlavicce vraci na uvod. Rozehranou hru to zahodi,
  // coz je u odkazu "domu" ocekavane chovani.
  function domu() {
    setJeDenni(false);
    setFaze("uvod");
    setKola([]);
    setIndex(0);
    setOdhaleno(null);
    setVyprselo(false);
    setVysledky([]);
  }

  const hraje = faze === "hra" && !konec && inzerat;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto w-full max-w-[min(95rem,calc((100vh-11rem)*4/3+23.5rem))] px-4 py-6 sm:px-6">
        <header className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:mb-6 sm:gap-3">
          <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">
            <button
              onClick={domu}
              aria-label="Zpět na úvodní obrazovku"
              className="rounded transition hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              hadejcenu.cz
            </button>
          </h1>

          <div className="justify-self-center">
            {hraje && !odhaleno && !jeDenni && (
              <Casomira
                key={index}
                delka={nastaveni.cas}
                onVyprselo={() => setVyprselo(true)}
              />
            )}
          </div>

          <div className="justify-self-end">
            {faze === "hra" && !konec && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 sm:px-4 sm:py-2">
                  {/* popisky jsou na uzkem displeji zbytecne - cislo mluvi samo */}
                  <span className="hidden text-xs uppercase tracking-wide text-slate-500 sm:inline">
                    Kolo{" "}
                  </span>
                  <span className="font-bold tabular-nums text-slate-100 sm:text-lg">
                    {index + 1}
                  </span>
                  <span className="text-slate-600 sm:text-lg"> / {kola.length}</span>
                </div>
                <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-2 py-1 sm:px-4 sm:py-2">
                  <span className="hidden text-xs uppercase tracking-wide text-emerald-500/80 sm:inline">
                    Body{" "}
                  </span>
                  <span className="font-bold tabular-nums text-emerald-300 sm:text-lg">
                    {zobrazenePody}
                  </span>
                  <span className="text-emerald-500/70 sm:hidden"> b</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {faze === "uvod" ? (
          <Uvod
            nastaveni={nastaveni}
            onStart={start}
            denni={{
              datum,
              odehrano: odehranoDnes(ulozene, datum),
              vysledek: ulozene.dny[datum],
              serie: aktualniSerie(ulozene, datum),
              onHrat: startDenni,
            }}
          />
        ) : konec ? (
          <Konec
            jeDenni={jeDenni}
            datum={datum}
            serie={aktualniSerie(ulozene, datum)}
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
