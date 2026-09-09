# hadejcenu.cz

Hra na hádání cen nemovitostí podle fotek. Inspirováno
[cribguessr.com](https://cribguessr.com), s českými inzeráty.

## Popis

Statický web bez backendu. Data inzerátů leží v `src/data/inzeraty.json`
a balí se do aplikace, fotky mají vlastní kopii na Cloudflare R2. Za běhu
se ze Srealit nestahuje nic, takže hra funguje i po smazání inzerátu.

Skóre vychází z poměru tipu a skutečné ceny, ne z rozdílu v korunách.
Dvojnásobný tip je stejná chyba jako poloviční, díky čemuž je garsonka
za 1,5 milionu stejně obtížná jako vila za 30.

Režimy: **Klasika** (vše), **Luxus** (od 10 mil.), **Brloh** (do 3 mil.).
K tomu filtr podle typu a kraje a čas na kolo od 5 sekund po neomezeně.

## Vývoj

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Skripty

Spouštějí se ručně, aplikace je za běhu nepoužívá.

```bash
node scripts/sber.mjs 300    # nasbírá inzeráty ze Srealit
node scripts/fotky.mjs       # stáhne fotky a nahraje je na R2
```

`sber.mjs` projde všech 14 krajů zvlášť pro byty a domy, u každého inzerátu
stáhne i detail kvůli patru, stavu objektu a ploše pozemku, a výsledek uloží
do `src/data/inzeraty.json`. Zdrojové adresy fotek jdou zvlášť do
`data/fotky-zdroje.json`, aby se nebalily do aplikace.

`fotky.mjs` je nutné spustit po každém sběru. Přepínač `--test` ověří spojení
s R2, `--limit N` zpracuje jen prvních N inzerátů. Skript lze kdykoli přerušit
a spustit znovu, už nahrané fotky přeskočí.

## Nastavení

Soubor `.env.example` se zkopíruje jako `.env` a doplní se údaji z Cloudflare
R2. Samotný `.env` se neverzuje.
