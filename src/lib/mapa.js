// Poskytovatel mapovych dlazdic. Menit se ma jen tady - komponenta Mapa
// o zadnem konkretnim zdroji nevi.
//
// OpenStreetMap funguje bez registrace a hodi se na rozjezd. Pro ostry
// provoz je lepsi Mapy.com: maji pro CR nesrovnatelne lepsi detail a
// 250 000 kreditu mesicne zdarma. Vyzaduji ale klic z developer.mapy.com.
//
// Klic patri do .env jako VITE_MAPY_KLIC. Ve statickem webu bude videt ve
// zdrojaku, proto ho pri vytvareni omez na vlastni domenu - pak je k nicemu
// komukoli jinemu.

const KLIC = import.meta.env?.VITE_MAPY_KLIC ?? "";

export const POSKYTOVATELE = {
  osm: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    popis: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  mapy: {
    // Tvar adresy over v dokumentaci Mapy.com, nez ho zapnes.
    url: `https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${KLIC}`,
    popis: '© <a href="https://mapy.com/">Mapy.com</a>',
    maxZoom: 19,
  },
};

// Prepnuti na "mapy" az bude klic v .env.
export const POSKYTOVATEL = KLIC ? POSKYTOVATELE.mapy : POSKYTOVATELE.osm;

export const ZOOM_MALY = 12;
export const ZOOM_VELKY = 15;
