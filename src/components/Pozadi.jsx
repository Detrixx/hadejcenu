// Pomalu plovouci emoji na pozadi uvodu. Pozice a casovani jsou pevne
// zapsane, ne nahodne - pri kazdem prekresleni by se jinak prvky preskladaly
// a misto klidneho pozadi by to polozilo oci.
const PRVKY = [
  { znak: "🏠", x: 6, y: 18, velikost: 3.2, trvani: 32, zpozdeni: 0, sila: 0.1 },
  { znak: "🏢", x: 88, y: 10, velikost: 2.6, trvani: 38, zpozdeni: -6, sila: 0.08 },
  { znak: "🔑", x: 22, y: 72, velikost: 2.1, trvani: 29, zpozdeni: -14, sila: 0.09 },
  { znak: "🏡", x: 78, y: 62, velikost: 3.6, trvani: 41, zpozdeni: -3, sila: 0.1 },
  { znak: "📍", x: 46, y: 88, velikost: 2.2, trvani: 34, zpozdeni: -20, sila: 0.07 },
  { znak: "🏘️", x: 12, y: 46, velikost: 2.8, trvani: 45, zpozdeni: -9, sila: 0.08 },
  { znak: "💰", x: 92, y: 40, velikost: 2.3, trvani: 31, zpozdeni: -25, sila: 0.09 },
  { znak: "🏚️", x: 64, y: 24, velikost: 2.4, trvani: 36, zpozdeni: -17, sila: 0.07 },
  { znak: "🏰", x: 34, y: 8, velikost: 2.5, trvani: 43, zpozdeni: -30, sila: 0.06 },
  { znak: "🏤", x: 70, y: 92, velikost: 2.7, trvani: 39, zpozdeni: -11, sila: 0.08 },
];

export default function Pozadi() {
  // Komu vadi pohyb na strance, tomu ho nenutime.
  const bezPohybu =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (bezPohybu) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {PRVKY.map((p, i) => (
        <span
          key={i}
          className="plove absolute select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.velikost}rem`,
            animationDuration: `${p.trvani}s`,
            animationDelay: `${p.zpozdeni}s`,
            "--sila": p.sila,
          }}
        >
          {p.znak}
        </span>
      ))}
    </div>
  );
}
