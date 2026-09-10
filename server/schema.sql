-- Jeden zaznam na hrace a den. Slozeny primarni klic zaridi, ze druhy
-- pokus tehoz prohlizece v tentyz den uz neprojde - bez nej by si kazdy
-- mohl zebricek zaplnit sam.
CREATE TABLE IF NOT EXISTS vysledky (
  datum      TEXT    NOT NULL,
  hrac       TEXT    NOT NULL,
  prezdivka  TEXT    NOT NULL,
  body       INTEGER NOT NULL,
  vytvoreno  INTEGER NOT NULL,
  PRIMARY KEY (datum, hrac)
);

-- Zebricek se vzdy cte pro jeden den serazeny podle bodu.
CREATE INDEX IF NOT EXISTS idx_datum_body ON vysledky (datum, body DESC);
