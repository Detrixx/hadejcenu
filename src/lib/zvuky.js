// Zvuky se skladaji primo v prohlizeci pres Web Audio. Zadne soubory,
// nulova velikost navic a plna kontrola nad tim, jak to zni.

const KLIC = "hadejcenu-zvuk";

let kontext = null;
let hlavni = null;

export function zvukZapnuty() {
  try {
    return localStorage.getItem(KLIC) !== "vyp";
  } catch {
    return true;
  }
}

export function prepniZvuk() {
  const nove = !zvukZapnuty();
  try {
    localStorage.setItem(KLIC, nove ? "zap" : "vyp");
  } catch {
    /* bez ulozeni se da hrat dal, jen se volba nezapamatuje */
  }
  if (nove) probudZvuk();
  return nove;
}

// Prohlizec nechá zvukovy kontext uspany, dokud uzivatel neklikne. Proto ho
// zakladame az pri prvni interakci - volame z tlacitka "Zacit hru".
export function probudZvuk() {
  if (!kontext) {
    const Trida = window.AudioContext ?? window.webkitAudioContext;
    if (!Trida) return null;
    kontext = new Trida();
    hlavni = kontext.createGain();
    hlavni.gain.value = 0.16; // celkove drzime potichu, hra neni diskoteka
    hlavni.connect(kontext.destination);
  }
  if (kontext.state === "suspended") kontext.resume();
  return kontext;
}

// Jeden ton s memkkym nabehem a doznenim. Ostry zacatek i konec by lupaly.
function ton({ frekvence, delka = 0.12, typ = "sine", sila = 1, zpozdeni = 0 }) {
  const c = probudZvuk();
  if (!c) return;

  const t = c.currentTime + zpozdeni;
  const osc = c.createOscillator();
  const obalka = c.createGain();

  osc.type = typ;
  osc.frequency.setValueAtTime(frekvence, t);

  obalka.gain.setValueAtTime(0, t);
  obalka.gain.linearRampToValueAtTime(sila, t + 0.008);
  // Exponencialni dozneni zni prirozeneji nez linearni; nula nejde zadat,
  // proto se blizime k ni.
  obalka.gain.exponentialRampToValueAtTime(0.0001, t + delka);

  osc.connect(obalka).connect(hlavni);
  osc.start(t);
  osc.stop(t + delka + 0.02);
}

// Odpocet posledních vterin. Posledni tri jsou vys a duraznejsi.
export function tikot(zbyva) {
  if (!zvukZapnuty()) return;
  const konec = zbyva <= 3;
  ton({
    frekvence: konec ? 1320 : 990,
    delka: 0.07,
    typ: "triangle",
    sila: konec ? 0.85 : 0.45,
  });
}

// Tiche cvrnkani, jak najizdi body. Vyska stoupa se skore, takze slysis,
// jak dobre to dopadlo, jeste nez se cislo zastavi.
export function bodyTik(podil) {
  if (!zvukZapnuty()) return;
  ton({ frekvence: 480 + podil * 720, delka: 0.035, typ: "sine", sila: 0.2 });
}

// Zaverecny akord kola. Pri dobrem tipu durovy, pri spatnem klesajici.
export function vysledek(body) {
  if (!zvukZapnuty()) return;
  const dobre = body >= 450;
  const zaklad = dobre ? 523.25 : 392;
  const pultony = dobre ? [0, 4, 7] : [0, -3, -7];
  pultony.forEach((p, i) =>
    ton({
      frekvence: zaklad * Math.pow(2, p / 12),
      delka: 0.4,
      typ: "triangle",
      sila: 0.42,
      zpozdeni: i * 0.085,
    })
  );
}

// Konec cele hry - o neco delsi rozklad nahoru.
export function fanfara() {
  if (!zvukZapnuty()) return;
  [0, 4, 7, 12].forEach((p, i) =>
    ton({
      frekvence: 523.25 * Math.pow(2, p / 12),
      delka: 0.5,
      typ: "triangle",
      sila: 0.4,
      zpozdeni: i * 0.1,
    })
  );
}
