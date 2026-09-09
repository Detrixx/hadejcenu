# hadejcenu.cz

Hra na hádání cen nemovitostí. Dostaneš fotky bytu nebo domu, pár údajů
o něm a zkusíš odhadnout, za kolik se prodává. Čím blíž jsi, tím víc bodů.

Inspirováno [cribguessr.com](https://cribguessr.com), ale s českými inzeráty.

## Jak to funguje

Statický web bez backendu. Data o inzerátech leží v `src/data/inzeraty.json`
a zabalí se rovnou do aplikace, fotky jsou ve vlastní kopii na Cloudflare R2.
Hra tedy nestahuje za běhu nic ze Srealit a funguje i poté, co tam inzerát
zmizí.

### Skóre

Body se počítají z **poměru** tipu a skutečné ceny, ne z rozdílu v korunách.
Tip dvojnásobný je stejná chyba jako tip poloviční, takže garsonka za 1,5
milionu je stejně těžká jako vila za 30. Bez toho by u drahých nemovitostí
stačilo střelit velké číslo.

### Režimy

| Režim | Rozsah cen |
|---|---|
| Klasika | vše |
| Luxus | od 10 mil. |
| Brloh | do 3 mil. |

K tomu jde filtrovat podle typu (byty / domy) a kraje a nastavit čas na kolo
od 5 sekund po neomezeně.

## Vývoj

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Skripty

Oba se pouštějí ručně, hra je za běhu nepotřebuje.

```bash
node scripts/sber.mjs 300    # nasbírá inzeráty ze Srealit
node scripts/fotky.mjs       # stáhne fotky a nahraje je na R2
```

`sber.mjs` projde všech 14 krajů zvlášť pro byty a domy, u každého inzerátu
stáhne i detail (kvůli patru, stavu objektu a ploše pozemku) a výsledek uloží
do `src/data/inzeraty.json`. Zdrojové adresy fotek jdou zvlášť do
`data/fotky-zdroje.json`, aby se nebalily do aplikace.

`fotky.mjs` je potřeba pustit po každém sběru. Umí `--test` pro ověření
spojení s R2 a `--limit N` pro zkušební dávku. Lze ho kdykoli přerušit
a spustit znovu — už nahrané fotky přeskočí.

### Nastavení

Zkopíruj `.env.example` jako `.env` a vyplň údaje z Cloudflare R2.
Soubor `.env` se neverzuje.

## Poznámky k datům

Fotky ze Srealit nejdou načíst ze syrové adresy (vrací 401) — fungují jen
přesné transformační presety, které používá jejich vlastní web. Strop je
1200 px na delší straně. Podrobnosti v `src/lib/fotky.js`.
