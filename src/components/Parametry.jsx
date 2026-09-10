// Vypise jen ty parametry, ktere prodavajici skutecne vyplnil.
// Nevyplnene uz odfiltroval sber (Sreality je posilaji jako placeholder
// "- vyber moznost"), takze tady staci vynechat prazdne hodnoty.
export default function Parametry({ inzerat }) {
  const z = inzerat;
  const radky = [];

  if (z.typ === "byt") {
    if (z.patro !== null) {
      radky.push(["Patro", z.pocetPodlazi ? `${z.patro}. z ${z.pocetPodlazi}` : `${z.patro}.`]);
    }
    if (z.vlastnictvi) radky.push(["Vlastnictví", z.vlastnictvi]);
    if (z.vytah) radky.push(["Výtah", z.vytah]);
  } else {
    if (z.plochaPozemku) radky.push(["Pozemek", `${new Intl.NumberFormat("cs-CZ").format(z.plochaPozemku)} m²`]);
    if (z.typObjektu) radky.push(["Typ domu", z.typObjektu]);
    if (z.pocetPodlazi) radky.push(["Podlaží", z.pocetPodlazi]);
  }

  if (z.konstrukce) radky.push(["Konstrukce", z.konstrukce]);
  if (z.energetickaTrida) radky.push(["Energetika", z.energetickaTrida]);

  const novostavba = z.stavObjektu === "Novostavba";

  if (!radky.length && !z.stavObjektu) return null;

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-700 pt-3 text-sm">
      {z.stavObjektu && (
        <div className="col-span-2 flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-slate-500">Stav</dt>
          <dd className={`text-right font-medium ${novostavba ? "text-emerald-300" : "text-slate-200"}`}>
            {novostavba && <span aria-hidden="true">✦ </span>}
            {z.stavObjektu}
          </dd>
        </div>
      )}
      {radky.map(([popis, hodnota]) => (
        <div key={popis} className="min-w-0">
          <dt className="truncate text-xs text-slate-500">{popis}</dt>
          <dd className="truncate font-medium text-slate-200">{hodnota}</dd>
        </div>
      ))}
    </dl>
  );
}
