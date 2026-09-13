// Identification d'une carte scannée (lib/tcgdex.ts), contre la vraie API
// TCGdex (gratuite) : à partir de ce que Claude lit sur la carte, le bon
// candidat doit sortir en tête — y compris les illustrations rares et les
// secrètes, numérotées au-delà du total du set, et les « ex » modernes que
// TCGdex écrit avec un tiret.
// Usage : node scripts/test-identification.mjs
import { readFileSync } from "node:fs";
import ts from "typescript";

const js = ts.transpileModule(readFileSync("lib/tcgdex.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { findCandidates, isUnambiguous, sameName } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);

let failed = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "  ok " : "ECHEC"} — ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

console.log("sameName");
check("Dracaufeu ex ≡ Dracaufeu-ex", sameName("Dracaufeu ex", "Dracaufeu-ex"));
check("M Dracaufeu EX ≡ M-Dracaufeu-EX", sameName("M Dracaufeu EX", "M-Dracaufeu-EX"));
check("Pikachu ≠ Pikachu-ex", !sameName("Pikachu", "Pikachu-ex"));

const CASES = [
  { label: "Dracaufeu ex 223/197 (illustration spéciale rare, Flammes Obsidiennes)", read: { name_fr: "Dracaufeu ex", number: "223", set_total: "197" }, first: "sv03-223", certain: true },
  { label: "Dracaufeu ex 228/197 (hyper rare)", read: { name_fr: "Dracaufeu ex", number: "228", set_total: "197" }, first: "sv03-228", certain: true },
  { label: "Dracaufeu ex 125/197 (double rare, version standard)", read: { name_fr: "Dracaufeu ex", number: "125", set_total: "197" }, first: "sv03-125", certain: true },
  { label: "Pikachu ex 179/131 (hyper rare, Évolutions Prismatiques)", read: { name_fr: "Pikachu ex", number: "179", set_total: "131" }, first: "sv08.5-179", certain: true },
  { label: "Pikachu ex, numéro illisible, total 131 → les deux versions proposées", read: { name_fr: "Pikachu ex", number: null, set_total: "131" }, contains: ["sv08.5-028", "sv08.5-179"], certain: false },
  { label: "Dracaufeu ex, numéro illisible, total 197 → les trois versions proposées", read: { name_fr: "Dracaufeu ex", number: null, set_total: "197" }, contains: ["sv03-125", "sv03-223", "sv03-228"], certain: false },
  { label: "Dracaufeu 4/102 (Set de Base)", read: { name_fr: "Dracaufeu", number: "4", set_total: "102" }, first: "base1-4", certain: true },
  { label: "Mewtwo GX 72/73 (Légendes Brillantes)", read: { name_fr: "Mewtwo GX", number: "72", set_total: "73" }, first: "sm3.5-72", certain: true },
  { label: "M Dracaufeu EX 13/106 (Étincelles)", read: { name_fr: "M Dracaufeu EX", number: "13", set_total: "106" }, first: "xy2-13", certain: true },
  { label: "Pikachu VMAX 188/185 (Voltage Éclatant, secrète)", read: { name_fr: "Pikachu VMAX", number: "188", set_total: "185" }, first: "swsh4-188", certain: true },
];

for (const c of CASES) {
  console.log(`\n${c.label}`);
  const ranked = await findCandidates(c.read);
  const ids = ranked.map((r) => r.id);
  console.log(`  candidats : ${ids.slice(0, 6).join(", ")}${ids.length > 6 ? " …" : ""}`);
  if (c.first) check(`en tête : ${c.first}`, ids[0] === c.first, `lu : ${ids[0] ?? "aucun"}`);
  if (c.contains) for (const id of c.contains) check(`propose ${id}`, ids.slice(0, 5).includes(id));
  check(`certitude ${c.certain ? "oui" : "non"}`, isUnambiguous(ranked, c.read) === c.certain);
}

console.log(failed ? `\n${failed} échec(s)` : "\nTout est vert.");
process.exit(failed ? 1 : 0);
