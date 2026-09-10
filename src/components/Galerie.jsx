import { useCallback, useEffect, useRef, useState } from "react";
import { fotoUrl } from "../lib/fotky";
import { FOTKY_ZAKLAD } from "../lib/hra";

// Kolecko mysi umi poslat desitky udalosti za vterinu - bez brzdy by
// jedno otoceni proletelo celou galerii.
const BRZDA_MS = 120;

export default function Galerie({ inzerat }) {
  const [index, setIndex] = useState(0);
  // 'nacita' | 'ok' | 'chyba' pro kazdou fotku zvlast
  const [stavy, setStavy] = useState({});
  const ramecek = useRef(null);
  const posledniKolecko = useRef(0);

  const pocet = inzerat?.pocetFotek ?? 0;
  const id = inzerat?.id;

  const jdi = useCallback(
    (posun) => setIndex((i) => (i + posun + pocet) % pocet),
    [pocet]
  );

  const oznac = (i, stav) => setStavy((s) => ({ ...s, [i]: stav }));

  // Prednacteme sousedni fotky, aby proklikavani neproblikavalo.
  useEffect(() => {
    if (pocet < 2) return;
    for (const posun of [1, -1]) {
      const soused = (index + posun + pocet) % pocet;
      const u = fotoUrl(FOTKY_ZAKLAD, id, soused, "velka");
      if (u) new Image().src = u;
    }
  }, [index, id, pocet]);

  useEffect(() => {
    if (pocet < 2) return;
    const klavesa = (e) => {
      if (e.key === "ArrowRight") jdi(1);
      if (e.key === "ArrowLeft") jdi(-1);
    };
    window.addEventListener("keydown", klavesa);
    return () => window.removeEventListener("keydown", klavesa);
  }, [jdi, pocet]);

  // Kolecko mysi. Listener pridavame rucne s passive:false, jinak nejde
  // zastavit rolovani stranky pod galerii.
  useEffect(() => {
    const el = ramecek.current;
    if (!el || pocet < 2) return;
    const kolecko = (e) => {
      e.preventDefault();
      const ted = Date.now();
      if (ted - posledniKolecko.current < BRZDA_MS) return;
      posledniKolecko.current = ted;
      jdi(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", kolecko, { passive: false });
    return () => el.removeEventListener("wheel", kolecko);
  }, [jdi, pocet]);

  // Prejeti prstem. Vodorovny tah presune fotku, svisly nechame projit,
  // aby slo strankou dal rolovat.
  const dotyk = useRef(null);

  const dotykStart = (e) => {
    const t = e.touches[0];
    dotyk.current = { x: t.clientX, y: t.clientY };
  };

  const dotykKonec = (e) => {
    if (!dotyk.current || pocet < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - dotyk.current.x;
    const dy = t.clientY - dotyk.current.y;
    dotyk.current = null;
    // Musi to byt zretelne vodorovny tah, jinak jde nejspis o rolovani.
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      jdi(dx < 0 ? 1 : -1);
    }
  };

  if (!pocet || !FOTKY_ZAKLAD) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-800">
        <Placeholder text="U tohoto inzerátu nejsou fotky" />
      </div>
    );
  }

  const stav = stavy[index] ?? "nacita";
  const velka = fotoUrl(FOTKY_ZAKLAD, id, index, "velka");

  return (
    <div className="min-w-0 space-y-2">
      <div
        ref={ramecek}
        onTouchStart={dotykStart}
        onTouchEnd={dotykKonec}
        className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-800 select-none"
      >
        {stav !== "chyba" && (
          <img
            key={velka}
            src={velka}
            alt={`Fotka ${index + 1} z ${pocet}`}
            draggable={false}
            onLoad={() => oznac(index, "ok")}
            onError={() => oznac(index, "chyba")}
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              stav === "ok" ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {stav === "nacita" && <div className="absolute inset-0 animate-pulse bg-slate-800" />}
        {stav === "chyba" && <Placeholder text="Fotka se nenačetla" />}

        {pocet > 1 && (
          <>
            <Sipka smer="vlevo" onClick={() => jdi(-1)} />
            <Sipka smer="vpravo" onClick={() => jdi(1)} />
          </>
        )}

        <div className="absolute bottom-2 right-2 rounded bg-slate-950/70 px-2 py-0.5 text-xs tabular-nums text-slate-200">
          {index + 1} / {pocet}
        </div>
      </div>

      {pocet > 1 && (
        <div className="pas-nahledu flex gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: pocet }, (_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Fotka ${i + 1}`}
              className={`h-12 w-16 shrink-0 overflow-hidden rounded border-2 transition ${
                i === index ? "border-emerald-400" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {stavy[i] === "chyba" ? (
                <div className="h-full w-full bg-slate-700" />
              ) : (
                <img
                  src={fotoUrl(FOTKY_ZAKLAD, id, i, "nahled")}
                  alt=""
                  loading="lazy"
                  onError={() => oznac(i, "chyba")}
                  className="h-full w-full bg-slate-700 object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Placeholder({ text }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-800 text-slate-500">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span className="text-xs">{text}</span>
    </div>
  );
}

function Sipka({ smer, onClick }) {
  const vlevo = smer === "vlevo";
  return (
    <button
      onClick={onClick}
      aria-label={vlevo ? "Předchozí fotka" : "Další fotka"}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-slate-950/60 p-2 text-slate-100 transition hover:bg-slate-950/90 ${
        vlevo ? "left-2" : "right-2"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d={vlevo ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </svg>
    </button>
  );
}
