import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { POSKYTOVATEL, ZOOM_MALY, ZOOM_VELKY } from "../lib/mapa";

export default function Mapa({ lat, lon, obec }) {
  const ramecek = useRef(null);
  const mapaRef = useRef(null);
  const [zvetseno, setZvetseno] = useState(false);

  // Mapu vytvorime jednou a pri zmene inzeratu jen premistime stred.
  useEffect(() => {
    if (!ramecek.current || mapaRef.current) return;

    const mapa = L.map(ramecek.current, {
      center: [lat, lon],
      zoom: ZOOM_MALY,
      zoomControl: false,
      attributionControl: true,
      // V male mapce vypnuto, aby se neposouvala omylem pri rolovani stranky.
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      keyboard: false,
    });

    L.tileLayer(POSKYTOVATEL.url, {
      maxZoom: POSKYTOVATEL.maxZoom,
      attribution: POSKYTOVATEL.popis,
    }).addTo(mapa);

    L.circleMarker([lat, lon], {
      radius: 8,
      color: "#34d399",
      weight: 3,
      fillColor: "#34d399",
      fillOpacity: 0.35,
    }).addTo(mapa);

    mapaRef.current = mapa;
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, [lat, lon]);

  // Po zmene velikosti ramecku musi Leaflet prepocitat rozmery, jinak
  // zustanou dlazdice vykreslene na puvodni plochu a mapa se rozpadne.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    const ovladani = zvetseno ? "enable" : "disable";
    mapa.dragging[ovladani]();
    mapa.scrollWheelZoom[ovladani]();
    mapa.doubleClickZoom[ovladani]();

    const id = setTimeout(() => {
      mapa.invalidateSize();
      mapa.setView([lat, lon], zvetseno ? ZOOM_VELKY : ZOOM_MALY);
    }, 210); // az po dobehnuti prechodu velikosti
    return () => clearTimeout(id);
  }, [zvetseno, lat, lon]);

  return (
    <div className="relative h-32">
      <div
        onMouseEnter={() => setZvetseno(true)}
        onMouseLeave={() => setZvetseno(false)}
        className={`absolute right-0 top-0 overflow-hidden rounded-xl border border-slate-700 transition-all duration-200 ${
          zvetseno ? "z-20 h-96 w-[34rem] shadow-2xl shadow-slate-950/60" : "z-0 h-32 w-full"
        }`}
      >
        <div ref={ramecek} className="h-full w-full bg-slate-800" />
        {!zvetseno && (
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-slate-950/75 px-2 py-0.5 text-xs text-slate-300">
            {obec} · najeď pro přiblížení
          </div>
        )}
      </div>
    </div>
  );
}
