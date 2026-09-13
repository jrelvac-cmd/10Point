// Tests sans réseau de la cote française via TCGGO (lib/tcggo.ts) :
// correspondance des identifiants TCGdex → pokemontcg.io, lecture d'une
// réponse de l'API avec le garde-fou, forme servie aux pages.
// Usage : node scripts/test-tcggo.mjs
import { readFileSync } from "node:fs";
import ts from "typescript";

// Le module importe le client Supabase admin : on le remplace par un leurre,
// seules les fonctions pures sont exercées ici.
const source = readFileSync("lib/tcggo.ts", "utf8")
  .replace('import { createAdminClient } from "./supabase/admin";', "const createAdminClient = () => { throw new Error(\"pas de base dans ce test\"); };")
  .replace('import type { TcgdexCard } from "./tcgdex";', "");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { toTcgid, readFrPrices, toFrPrice } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);

let failed = 0;
function check(label, ok) {
  console.log(`${ok ? "  ok " : "ECHEC"} — ${label}`);
  if (!ok) failed++;
}

console.log("toTcgid");
const unchanged = ["base1-4", "ecard1-25", "sm9-14", "xy8-25", "hgss4-4", "swsh12pt5-1", "sv10-1", "xy0-1", "cel25-1"];
for (const id of unchanged) check(`${id} inchangé`, toTcgid(id) === id);
const mapped = {
  "sv03-223": "sv3-223",
  "me01-5": "me1-5",
  "sv08.5-28": "sv8pt5-28",
  "sv03.5-1": "sv3pt5-1",
  "swsh12.5-10": "swsh12pt5-10",
  "swsh12.5gg-GG01": "swsh12pt5gg-GG01",
  "swsh4.5-1": "swsh45-1",
  "swsh4.5sv-SV001": "swsh45sv-SV001",
  "swsh3.5-1": "swsh35-1",
  "swsh10.5-1": "pgo-1",
  "sm3.5-1": "sm35-1",
  "sm7.5-1": "sm75-1",
  "sv10.5b-1": "zsv10pt5-1",
  "sv10.5w-1": "rsv10pt5-1",
};
for (const [from, to] of Object.entries(mapped)) check(`${from} → ${to} (lu : ${toTcgid(from)})`, toTcgid(from) === to);

console.log("\nreadFrPrices");
const cm = (fr, avg) => ({ prices: { cardmarket: { lowest_near_mint_FR: fr, "30d_average": avg } } });
const ids = ["sm9-14", "hgss4-4", "ecard1-25", "base1-4", "xy8-25", "sv03-223"];
const json = {
  data: [
    { tcgid: "sm9-14", ...cm(12, 10) },
    { tcgid: "hgss4-4", ...cm(14, 3.74) },
    { tcgid: "ecard1-25", ...cm(500, 107.17) },
    { tcgid: "base1-4", ...cm(undefined, 2475.96) },
    { tcgid: "sv3-223", ...cm(80, 99.56) },
    { tcgid: "inconnu-1", ...cm(1, 1) },
  ],
};
const prices = readFrPrices(json, ids);
check("la Map contient exactement les identifiants TCGdex demandés", [...prices.keys()].join() === ids.join());
check("FR valide (12 pour 10 de moyenne) → 12", prices.get("sm9-14") === 12);
check("FR aberrante (14 pour 3,74) → null", prices.get("hgss4-4") === null);
check("FR aberrante (500 pour 107) → null", prices.get("ecard1-25") === null);
check("FR absente → null", prices.get("base1-4") === null);
check("carte absente de la réponse → null", prices.get("xy8-25") === null);
check("réassociation par identifiant normalisé (sv03-223 ← sv3-223) → 80", prices.get("sv03-223") === 80);
check("sans moyenne 30 j → null", readFrPrices({ data: [{ tcgid: "sm9-14", prices: { cardmarket: { lowest_near_mint_FR: 5 } } }] }, ["sm9-14"]).get("sm9-14") === null);
check("réponse vide → tout à null", readFrPrices({}, ["sm9-14"]).get("sm9-14") === null);

console.log("\ntoFrPrice");
check("prix null → null", toFrPrice({ price: null }) === null);
check("ligne absente → null", toFrPrice(null) === null);
check('"12.00" (numeric Postgres) → { price: 12 }', toFrPrice({ price: "12.00" })?.price === 12);

console.log(failed ? `\n${failed} échec(s)` : "\nTout est vert.");
process.exit(failed ? 1 : 0);
