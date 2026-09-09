import { useEffect, useRef, useState } from "react";

// Postupne "najede" cislo na cilovou hodnotu - vzdy z te, na ktere prave
// stoji, takze prubezne skore v hlavicce nepada pri kazdem kole zpet na nulu.
// Respektuje systemove nastaveni pro omezeny pohyb.
export function usePocitadlo(cil, trvani = 900) {
  const [hodnota, setHodnota] = useState(0);
  const aktualni = useRef(0);

  useEffect(() => {
    const bezPohybu =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let raf;

    // I skok na cilovou hodnotu vedeme pres animacni snimek, aby se stav
    // nemenil synchronne uvnitr efektu (zbytecne prekresleni navic).
    if (bezPohybu || trvani <= 0) {
      raf = requestAnimationFrame(() => {
        aktualni.current = cil;
        setHodnota(cil);
      });
      return () => cancelAnimationFrame(raf);
    }

    const zacatek = aktualni.current;
    const rozdil = cil - zacatek;
    if (rozdil === 0) return;

    const start = performance.now();
    const krok = (ted) => {
      const t = Math.min((ted - start) / trvani, 1);
      const zpomaleni = 1 - Math.pow(1 - t, 3); // ke konci zpomaluje
      const v = Math.round(zacatek + rozdil * zpomaleni);
      aktualni.current = v;
      setHodnota(v);
      if (t < 1) raf = requestAnimationFrame(krok);
    };
    raf = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(raf);
  }, [cil, trvani]);

  return hodnota;
}
