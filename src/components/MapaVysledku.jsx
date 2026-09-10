import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { POSKYTOVATEL } from "../lib/mapa";
import { formatCena } from "../lib/skore";

// Prehled cele hry na mape. Souradnice mame u kazdeho inzeratu, takze je to
// zadarmo - a je hezke videt, kam te to po republice honilo.
export default function MapaVysledku({ vysledky }) {
  const ramecek = useRef(null);
  const mapaRef = useRef(null);

  useEffect(() => {
    if (!ramecek.current || mapaRef.current) return;

    const body = vysledky
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v.inzerat.lat != null && v.inzerat.lon != null);
    if (!body.length) return;

    const mapa = L.map(ramecek.current, {
      zoomControl: true,
      scrollWheelZoom: false, // at kolecko rolovalo strankou, ne mapou
    });

    L.tileLayer(POSKYTOVATEL.url, {
      maxZoom: POSKYTOVATEL.maxZoom,
      attribution: POSKYTOVATEL.popis,
    }).addTo(mapa);

    for (const { v, i } of body) {
      const z = v.inzerat;
      // Vlastni znacka misto vychoziho spendliku - ten by potreboval obrazek,
      // ktery se s balickovanim spatne snasi.
      const ikona = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;border-radius:9999px;
          background:#34d399;color:#0f172a;
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:14px;
          box-shadow:0 0 0 3px rgba(52,211,153,.35)">${i + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([z.lat, z.lon], { icon: ikona })
        .addTo(mapa)
        .bindPopup(
          `<strong>${i + 1}. ${z.obec}</strong><br>` +
            `${z.dispozice ?? ""} · ${formatCena(z.cena)}<br>` +
            `tvůj tip ${formatCena(v.tip)} · ${v.body} b.`
        );
    }

    mapa.fitBounds(
      body.map(({ v }) => [v.inzerat.lat, v.inzerat.lon]),
      { padding: [40, 40], maxZoom: 11 }
    );

    mapaRef.current = mapa;
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, [vysledky]);

  const maSouradnice = vysledky.some((v) => v.inzerat.lat != null);
  if (!maSouradnice) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Kde to bylo
      </h3>
      <div
        ref={ramecek}
        className="h-64 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800 sm:h-80"
      />
    </div>
  );
}
