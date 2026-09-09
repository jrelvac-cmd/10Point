// Tests des filtres de la cote française (lib/ebay.ts), sans appel réseau :
// lecture des titres d'annonces eBay et agrégation des prix.
// Usage : node scripts/test-prix-fr.mjs
import { readFileSync } from "node:fs";
import ts from "typescript";

// Le module importe le client Supabase admin : on le remplace par un leurre,
// seules les fonctions pures sont exercées ici.
const source = readFileSync("lib/ebay.ts", "utf8")
  .replace('import { createAdminClient } from "./supabase/admin";', "const createAdminClient = () => { throw new Error(\"pas de base dans ce test\"); };")
  .replace('import type { TcgdexCard } from "./tcgdex";', "");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { matchesCard, judgeTitle, aggregate, FR_MIN_SAMPLES } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);

let failed = 0;
function check(label, ok) {
  console.log(`${ok ? "  ok " : "ECHEC"} — ${label}`);
  if (!ok) failed++;
}

const dracaufeu = { name: "Dracaufeu", localId: "4", setPrintedTotal: 102 };

console.log("\nLe titre parle bien de la carte");
check("nom + numéro dans le set", matchesCard("Carte Pokémon Dracaufeu 4/102 Set de Base holo", dracaufeu));
check("numéro avec espaces et zéro devant", matchesCard("DRACAUFEU 004 / 102 wizards 1999", dracaufeu));
check("accent absent dans le titre", matchesCard("dracaufeu 4/102 base set fr", dracaufeu));
check("autre numéro du même set refusé", !matchesCard("Dracaufeu 4/130 Base Set 2", dracaufeu));
check("autre Pokémon refusé", !matchesCard("Tortank 2/102 Set de Base", dracaufeu));
check("numéro seul quand le set n'a pas de total", matchesCard("Pikachu 25 promo", { name: "Pikachu", localId: "25", setPrintedTotal: null }));

console.log("\nLecture de l'état et de la langue");
check("gradée PSA rejetée", judgeTitle("Dracaufeu 4/102 PSA 9 Set de Base") === "rejected");
check("lot rejeté", judgeTitle("Lot de 3 cartes Dracaufeu 4/102") === "rejected");
check("version anglaise rejetée", judgeTitle("Charizard 4/102 Base Set English NM") === "rejected");
check("mention EN rejetée", judgeTitle("Dracaufeu 4/102 EN near mint") === "rejected");
check("carte abîmée rejetée", judgeTitle("Dracaufeu 4/102 abîmée played") === "rejected");
check("note 7/10 rejetée", judgeTitle("Dracaufeu 4/102 état 7/10") === "rejected");
check("note 8,5/10 rejetée", judgeTitle("Dracaufeu 4/102 état 8,5/10") === "rejected");
check("near mint explicite acceptée", judgeTitle("Dracaufeu 4/102 Set de Base NM") === "good");
check("9/10 explicite acceptée", judgeTitle("Dracaufeu holo 4/102 état 9/10") === "good");
check("9,5/10 acceptée", judgeTitle("Dracaufeu 4/102 9,5/10") === "good");
check("neuve acceptée", judgeTitle("Dracaufeu 4/102 carte neuve") === "good");
check("rien de dit : inconnue", judgeTitle("Dracaufeu 4/102 Set de Base") === "unknown");
check("version française explicite reste acceptable", judgeTitle("Dracaufeu 4/102 française VF") === "unknown");

console.log("\nAgrégation");
const sold = (prices, suffix = " NM") =>
  prices.map((price) => ({ title: `Dracaufeu 4/102 Set de Base${suffix}`, price, currency: "EUR" }));
check("moins de trois ventes : pas de cote", aggregate(sold([1200, 1300]), dracaufeu, "sold") === null);
const a = aggregate(sold([1200, 1349, 1400]), dracaufeu, "sold");
check("médiane de trois ventes", a?.price === 1349 && a.count === 3);
const b = aggregate(
  [...sold([1, 1250, 1300, 1349, 1349, 1360, 1400, 1450, 1500, 9999]), ...sold([1349], "")],
  dracaufeu,
  "sold",
);
check("les extrêmes (1 € et 9 999 €) n'entrent pas dans la médiane", b !== null && b.price > 1300 && b.price < 1420);
check("les annonces sans état complètent seulement si les bonnes manquent", b?.count === 10);
const c = aggregate(sold([1300, 1400, 1500, 1600]), dracaufeu, "active");
check("annonces en cours : quart inférieur, pas médiane", c !== null && c.price < 1450);
const d = aggregate(
  [...sold([1200, 1300, 1400]), { title: "Charizard 4/102 Base Set NM", price: 400, currency: "EUR" }, { title: "Dracaufeu 4/102 NM", price: 1500, currency: "USD" }],
  dracaufeu,
  "sold",
);
check("anglaise et devise étrangère écartées", d?.count === 3);
check("seuil minimal exporté", FR_MIN_SAMPLES === 3);

console.log(failed ? `\n${failed} vérification(s) en échec` : "\nTout est vert");
process.exit(failed ? 1 : 0);
