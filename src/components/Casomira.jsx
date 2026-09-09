import { useEffect, useRef, useState } from "react";

// Odpocet jednoho kola. Komponenta se pro kazde kolo znovu vytvori (pres key),
// takze se cas resetuje sam a pri odhaleni se zastavi tim, ze zmizi.
export default function Casomira({ delka, onVyprselo }) {
  const [zbyva, setZbyva] = useState(delka ?? 0);
  // Drzime posledni verzi callbacku v refu, aby odpocet nezavisel na tom,
  // jestli rodic mezitim vytvoril novou funkci - jinak by se interval
  // rusil a zakladal znovu pri kazdem prekresleni.
  const konecRef = useRef(onVyprselo);
  useEffect(() => {
    konecRef.current = onVyprselo;
  }, [onVyprselo]);

  useEffect(() => {
    if (!delka) return; // neomezeny cas
    // Pocitame proti pevnemu okamziku, ne odectenim po sekundach - jinak
    // by se cas rozesel, kdyz prohlizec kartu uspi nebo zpomali.
    const konec = Date.now() + delka * 1000;
    const id = setInterval(() => {
      const z = Math.max(0, Math.ceil((konec - Date.now()) / 1000));
      setZbyva(z);
      if (z === 0) {
        clearInterval(id);
        konecRef.current?.();
      }
    }, 200);
    return () => clearInterval(id);
  }, [delka]);

  if (!delka) {
    return <div className="text-lg font-semibold tabular-nums text-slate-600">∞</div>;
  }

  // U petisekundoveho limitu nema smysl varovat deset sekund predem.
  const prah = Math.max(3, Math.min(10, Math.round(delka * 0.25)));
  const varuje = zbyva <= prah;

  const minuty = Math.floor(zbyva / 60);
  const sekundy = zbyva % 60;
  const text = minuty > 0 ? `${minuty}:${String(sekundy).padStart(2, "0")}` : String(sekundy);

  return (
    <div
      className={`text-3xl font-bold tabular-nums transition-colors ${
        varuje ? "blika text-rose-400" : "text-slate-100"
      }`}
      role="timer"
      aria-live={varuje ? "assertive" : "off"}
    >
      {text}
    </div>
  );
}
