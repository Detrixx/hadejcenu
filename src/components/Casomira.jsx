import { useEffect, useRef, useState } from "react";
import { tikot } from "../lib/zvuky";

// Odpocet jednoho kola. Komponenta se pro kazde kolo znovu vytvori (pres key),
// takze se cas resetuje sam a pri odhaleni se zastavi tim, ze zmizi.
export default function Casomira({ delka, onVyprselo }) {
  const [zbyva, setZbyva] = useState(delka ?? 0);
  const [podil, setPodil] = useState(1);
  // Drzime posledni verzi callbacku v refu, aby odpocet nezavisel na tom,
  // jestli rodic mezitim vytvoril novou funkci.
  const konecRef = useRef(onVyprselo);
  const posledniTik = useRef(null);

  useEffect(() => {
    konecRef.current = onVyprselo;
  }, [onVyprselo]);

  // U petisekundoveho limitu nema smysl varovat deset sekund predem.
  const prah = delka ? Math.max(3, Math.min(10, Math.round(delka * 0.25))) : 0;

  useEffect(() => {
    if (!delka) return;
    // Pocitame proti pevnemu okamziku, ne odectenim po sekundach - jinak
    // by se cas rozesel, kdyz prohlizec kartu uspi nebo zpomali.
    const konec = Date.now() + delka * 1000;

    // Stokrat za vterinu netreba, ale desetkrat ano - proužek se pak hybe
    // plynule misto po skocich.
    const id = setInterval(() => {
      const zbyvaMs = Math.max(0, konec - Date.now());
      const vteriny = Math.ceil(zbyvaMs / 1000);

      setZbyva(vteriny);
      setPodil(zbyvaMs / (delka * 1000));

      // Tikot jen jednou za vterinu, ne pri kazdem prekresleni.
      if (vteriny > 0 && vteriny <= prah && posledniTik.current !== vteriny) {
        posledniTik.current = vteriny;
        tikot(vteriny);
      }

      if (zbyvaMs === 0) {
        clearInterval(id);
        konecRef.current?.();
      }
    }, 100);

    return () => clearInterval(id);
  }, [delka, prah]);

  if (!delka) {
    return <div className="text-lg font-semibold tabular-nums text-slate-600">∞</div>;
  }

  const varuje = zbyva <= prah;
  const minuty = Math.floor(zbyva / 60);
  const sekundy = zbyva % 60;
  const text = minuty > 0 ? `${minuty}:${String(sekundy).padStart(2, "0")}` : String(zbyva);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`text-2xl font-bold tabular-nums leading-none transition-colors sm:text-3xl ${
          varuje ? "blika text-rose-400" : "text-slate-100"
        }`}
        role="timer"
        aria-live={varuje ? "assertive" : "off"}
      >
        {text}
      </div>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-700 sm:w-20">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-100 ease-linear ${
            varuje ? "bg-rose-400" : "bg-emerald-400"
          }`}
          style={{ width: `${Math.max(0, podil) * 100}%` }}
        />
      </div>
    </div>
  );
}
