import { useEffect, useRef, useState } from "react";
import { formatCislo } from "../lib/skore";
import { nactiZebricek, odesliVysledek } from "../lib/zebricek";
import {
  idHrace,
  nactiPrezdivku,
  zapisPrezdivku,
  oznacOdeslano,
  jeOdeslano,
  hostovskeJmeno,
} from "../lib/ulozeni";

// Klouzava okna, ne kalendarni tyden a mesic - zebricek tak nikdy
// nezacina prazdny jen proto, ze zrovna zacalo nove obdobi.
const OBDOBI = [
  ["den", "Dnes"],
  ["tyden", "7 dní"],
  ["mesic", "30 dní"],
];

const SPICKA = 3; // kolik prvnich mist se ukaze vzdycky
const OKOLI = 2; // kolik radku nad a pod hracem

// Ze vsech radku vybere jen spicku a okoli hrace. Mezi useky vlozi znacku
// "mezera", aby bylo videt, ze se neco preskocilo.
function zkrat(poradi, mujIndex) {
  if (poradi.length <= SPICKA + OKOLI * 2 + 2) {
    return poradi.map((r, i) => ({ r, i }));
  }

  const vybrane = new Set();
  for (let i = 0; i < SPICKA; i++) vybrane.add(i);
  if (mujIndex >= 0) {
    for (let i = mujIndex - OKOLI; i <= mujIndex + OKOLI; i++) {
      if (i >= 0 && i < poradi.length) vybrane.add(i);
    }
  }

  const serazene = [...vybrane].sort((a, b) => a - b);
  const vysledek = [];
  let predchozi = -1;
  for (const i of serazene) {
    if (predchozi >= 0 && i > predchozi + 1) vysledek.push("mezera");
    vysledek.push({ r: poradi[i], i });
    predchozi = i;
  }
  return vysledek;
}

// jenCteni = hrac dnesni vyzvu nehral, takze nema co zapisovat a vidi
// pouze tabulku.
export default function Zebricek({ datum, body = null, jenCteni = false }) {
  const [prezdivka, setPrezdivka] = useState("");
  const [zapsano, setZapsano] = useState(() => jeOdeslano(datum));
  const [jmenoVTabulce, setJmenoVTabulce] = useState(() => nactiPrezdivku());
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState(null);
  const [data, setData] = useState(null);
  const [nacitam, setNacitam] = useState(true);
  const [obdobi, setObdobi] = useState("den");
  const [vse, setVse] = useState(false);

  const muzeZapsat = !jenCteni && Number.isFinite(body);

  async function stahni(kdy = obdobi) {
    setNacitam(true);
    setData(await nactiZebricek(datum, kdy));
    setNacitam(false);
  }

  // Tabulku nacteme hned pri zobrazeni - komponenta se vykresluje az
  // ve chvili, kdy si ji nekdo vyzada.
  useEffect(() => {
    stahni(obdobi);
    setVse(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datum, obdobi]);

  // Vysledek se zapisuje sam, bez klikani. Kdo uz nekdy prezdivku zadal,
  // zapise se pod ni; ostatni pod nahradnim jmenem, ktere si pak muzou
  // prepsat. Ref hlida, aby se pri opakovanem vykresleni neodesilalo dvakrat.
  const zapisujeSe = useRef(false);
  useEffect(() => {
    if (!muzeZapsat || zapsano || zapisujeSe.current) return;
    zapisujeSe.current = true;

    (async () => {
      const jmeno = nactiPrezdivku() || hostovskeJmeno();
      const vysledek = await odesliVysledek({ datum, hrac: idHrace(), prezdivka: jmeno, body });
      if (!vysledek.ok) {
        setChyba(vysledek.chyba);
        zapisujeSe.current = false;
        return;
      }
      oznacOdeslano(datum);
      setZapsano(true);
      setJmenoVTabulce(jmeno);
      stahni("den");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muzeZapsat, zapsano, datum, body]);

  // Prejmenovani. Server pri druhem zapisu meni jen jmeno, skore zustava.
  async function prejmenuj() {
    const jmeno = prezdivka.trim();
    if (!jmeno) return;
    setOdesilam(true);
    setChyba(null);

    const vysledek = await odesliVysledek({ datum, hrac: idHrace(), prezdivka: jmeno, body });
    setOdesilam(false);

    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      return;
    }
    zapisPrezdivku(jmeno);
    setJmenoVTabulce(jmeno);
    setPrezdivka("");
    stahni(obdobi);
  }

  const poradi = data?.poradi ?? [];
  // Hrace poznavame podle jmena - server jine rozlisení neposila a pri
  // par desitkach hracu to staci.
  const mujIndex = jmenoVTabulce ? poradi.findIndex((r) => r.prezdivka === jmenoVTabulce) : -1;
  const zkracene = zkrat(poradi, mujIndex);
  const jeZkraceno = zkracene.length < poradi.length;

  // Po rozbaleni sjedeme na vlastni radek, at ho hrac nemusi hledat.
  const mujRadek = useRef(null);
  useEffect(() => {
    if (vse && mujRadek.current) {
      mujRadek.current.scrollIntoView({ block: "center" });
    }
  }, [vse]);

  const radek = ({ r, i }) => {
    const jaSam = i === mujIndex;
    return (
      <li
        key={i}
        ref={jaSam ? mujRadek : null}
        className={`flex items-center gap-3 rounded px-2 py-1 text-sm ${
          jaSam
            ? "bg-emerald-500/10 ring-1 ring-emerald-500/40"
            : i < 3
              ? "bg-slate-700/30"
              : ""
        }`}
      >
        <span className="w-6 shrink-0 text-right tabular-nums text-slate-500">{i + 1}.</span>
        <span className="min-w-0 flex-1 truncate text-slate-200">
          {r.prezdivka}
          {obdobi !== "den" && (
            <span className="ml-2 text-xs text-slate-500">
              {r.dnu} {r.dnu === 1 ? "den" : r.dnu < 5 ? "dny" : "dní"}
            </span>
          )}
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-100">
          {formatCislo(r.body)}
        </span>
      </li>
    );
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-left">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-bold text-slate-100">
          {{ den: "Žebříček dne", tyden: "Žebříček týdne", mesic: "Žebříček měsíce" }[obdobi]}
        </h3>
        {data && (
          <span className="text-xs text-slate-500">
            {data.pocet} {data.pocet === 1 ? "hráč" : data.pocet < 5 ? "hráči" : "hráčů"}
          </span>
        )}
      </div>

      <div className="mb-3 flex gap-1 rounded-lg bg-slate-900/60 p-1">
        {OBDOBI.map(([id, popisek]) => (
          <button
            key={id}
            onClick={() => setObdobi(id)}
            aria-pressed={obdobi === id}
            className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition ${
              obdobi === id ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {popisek}
          </button>
        ))}
      </div>

      {muzeZapsat && obdobi === "den" && (
        <div className="mb-3 space-y-2 rounded-lg bg-slate-900/40 p-3">
          <p className="text-sm text-slate-400">
            {zapsano ? (
              <>
                Zapsáno jako{" "}
                <span className="font-semibold text-slate-200">{jmenoVTabulce}</span>. Chceš jiné
                jméno?
              </>
            ) : (
              "Zapisuji výsledek…"
            )}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={prezdivka}
              onChange={(e) => setPrezdivka(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && prejmenuj()}
              placeholder="Tvoje přezdívka"
              maxLength={20}
              className="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={prejmenuj}
              disabled={!prezdivka.trim() || odesilam || !zapsano}
              className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
            >
              {odesilam ? "Ukládám…" : "Uložit"}
            </button>
          </div>
          {chyba && <p className="text-sm text-rose-400">{chyba}</p>}
        </div>
      )}

      {nacitam && <p className="text-sm text-slate-500">Načítám…</p>}

      {!nacitam && poradi.length > 0 && (
        <>
          {vse ? (
            <ol className="pas-nahledu max-h-80 space-y-1 overflow-y-auto pr-1">
              {poradi.map((r, i) => radek({ r, i }))}
            </ol>
          ) : (
            <ol className="space-y-1">
              {zkracene.map((polozka, k) =>
                polozka === "mezera" ? (
                  <li
                    key={`mezera-${k}`}
                    className="py-0.5 text-center text-xs tracking-widest text-slate-600"
                    aria-hidden="true"
                  >
                    ···
                  </li>
                ) : (
                  radek(polozka)
                )
              )}
            </ol>
          )}

          {(jeZkraceno || vse) && (
            <button
              onClick={() => setVse((v) => !v)}
              className="mt-2 w-full rounded-lg border border-slate-700 py-1.5 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            >
              {vse ? "Zobrazit jen špičku" : `Zobrazit celý žebříček (${poradi.length})`}
            </button>
          )}
        </>
      )}

      {!nacitam && data && poradi.length === 0 && (
        <p className="text-sm text-slate-500">
          {obdobi === "den"
            ? "Dneska zatím nikdo nehrál :("
            : "V tomhle období zatím nikdo nehrál :("}
        </p>
      )}

      {!nacitam && data === null && (
        <p className="text-sm text-slate-500">Žebříček se teď nepodařilo načíst.</p>
      )}
    </div>
  );
}
