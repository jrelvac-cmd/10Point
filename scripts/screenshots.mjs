// Captures d'écran réelles de l'application pour la page publique
// (public/screenshots/*.webp). Compte jetable avec une collection réelle
// (cartes déjà en cache), Edge piloté en format iPhone, fausse caméra par
// canvas pour le viseur. Le serveur `npm run dev` doit tourner.
//
// Usage : node scripts/screenshots.mjs
import fs from "node:fs";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[2].trim()) process.env[m[1]] = m[2].trim();
}

const BASE = "http://localhost:3000";
const OUT = "public/screenshots";
const CARD_FILE = "public/_shot-card.jpg";
const EMAIL = "captures@example.com";
const PASSWORD = "Captures-1234";
const USERNAME = "sacha";
const ITEMS = [
  { card_id: "base1-4", quantity: 1, is_holo: true },
  { card_id: "ecard1-25", quantity: 1, is_holo: true },
  { card_id: "ex5-4", quantity: 1, is_holo: true },
  { card_id: "sm9-14", quantity: 2, is_reverse: true },
  { card_id: "base1-58", quantity: 3 },
  { card_id: "hgss4-4", quantity: 1, is_reverse: true },
  { card_id: "xy8-25", quantity: 2 },
  { card_id: "bw3-4", quantity: 4 },
];

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function deleteExisting() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users.filter((x) => x.email === EMAIL)) await admin.auth.admin.deleteUser(u.id);
}

await deleteExisting();
const { data: created, error } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { username: USERNAME },
});
if (error) throw error;
const userId = created.user.id;
await admin.from("profiles").update({ username_set: true, plan: "pro", share_collection: true, scans_this_month: 37 }).eq("id", userId);
const { data: profile } = await admin.from("profiles").select("username").eq("id", userId).single();
const { error: itemsErr } = await admin.from("collection_items").insert(ITEMS.map((i) => ({ user_id: userId, is_holo: false, is_reverse: false, ...i })));
if (itemsErr) throw itemsErr;
console.log("compte", EMAIL, "pseudo", profile.username, "cartes", ITEMS.length);

// Releve vieux de 29 jours pour que la variation porte sur la fenetre entiere ; retire a la fin.
const HIST_DATE = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
const GROWTH = { "base1-4": 0.12, "ecard1-25": 0.36, "ex5-4": -0.06, "sm9-14": 0.09, "base1-58": 0.22, "hgss4-4": 0.02, "xy8-25": 0.12, "bw3-4": -0.04, };
const ids = ITEMS.map((i) => i.card_id);

// Cote de vitrine : le fondateur veut voir le Dracaufeu du Set de Base a 1 349 EUR sur
// la page publique. La vraie ligne est sauvegardee et remise en place a la fin, quoi qu il arrive.
// Le scan reel rafraichit la cote depuis TCGdex : la vitrine est reposee apres lui.
const SHOWCASE_PRICES = {
  "base1-4": { trend: 1305.4, low: 980, avg1: 1349, avg7: 1322.1, avg30: 1349 },
};
const savedPrices = [];
for (const [cardId] of Object.entries(SHOWCASE_PRICES)) {
  const { data: row } = await admin.from("card_prices").select("card_id, trend, low, avg1, avg7, avg30").eq("card_id", cardId).single();
  if (row) savedPrices.push(row);
}
async function applyShowcase() {
  for (const [cardId, values] of Object.entries(SHOWCASE_PRICES)) {
    await admin.from("card_prices").update(values).eq("card_id", cardId);
  }
}
await applyShowcase();
console.log("cotes de vitrine posees :", Object.keys(SHOWCASE_PRICES).join(", "));
const { data: prices } = await admin.from("card_prices").select("card_id, trend, avg30, reverse_trend").in("card_id", ids);
const rows = prices.map((p) => ({ card_id: p.card_id, snapshot_date: HIST_DATE, trend: p.trend == null ? null : +(p.trend / (1 + GROWTH[p.card_id])).toFixed(2), avg30: p.avg30 == null ? null : +(p.avg30 / (1 + GROWTH[p.card_id])).toFixed(2), reverse_trend: p.reverse_trend == null ? null : +(p.reverse_trend / (1 + GROWTH[p.card_id])).toFixed(2) }));
// Cotes marquees fraiches pour la capture : sans le pictogramme « cote a rafraichir ».
await admin.from("card_prices").update({ cached_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86_400_000).toISOString() }).in("card_id", ids);

try {
const { error: histErr } = await admin.from("price_history").insert(rows);
if (histErr) throw histErr;
console.log("releves inseres", rows.length, "au", HIST_DATE);

fs.mkdirSync(OUT, { recursive: true });
// Carte présentée à la fausse caméra, servie par le serveur de dev le temps des captures.
fs.writeFileSync(CARD_FILE, Buffer.from(await (await fetch("https://assets.tcgdex.net/fr/base/base1/4/high.jpg")).arrayBuffer()));
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--use-fake-ui-for-media-stream"] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: "fr-FR",
  colorScheme: "light",
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
await context.grantPermissions(["camera"]);

// Fausse caméra : table sombre, puis la carte quand __showCard() est appelé.
// toBlob est retenu tant que __holdShot vaut vrai, pour figer l'état « détectée » ;
// la prise retenue part dès que __holdShot repasse à faux, comme un vrai déclenchement.
await context.addInitScript(() => {
  // Le badge de developpement Next.js ne doit pas apparaitre sur les captures.
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = "nextjs-portal{display:none!important}";
    document.head.appendChild(s);
  });
  const W = 720;
  const H = 1280;
  let showCard = false;
  window.__showCard = () => {
    showCard = true;
  };
  let hold = false;
  let held = null;
  Object.defineProperty(window, "__holdShot", {
    get: () => hold,
    set: (v) => {
      hold = v;
      if (!v && held) {
        const run = held;
        held = null;
        run();
      }
    },
  });
  const origToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (cb, ...rest) {
    if (hold) {
      held = () => origToBlob.call(this, cb, ...rest);
      return;
    }
    return origToBlob.call(this, cb, ...rest);
  };
  navigator.mediaDevices.getUserMedia = async () => {
    const img = new Image();
    img.src = "/_shot-card.jpg";
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    const grain = document.createElement("canvas");
    grain.width = W;
    grain.height = H;
    const g = grain.getContext("2d");
    const d = g.createImageData(W, H);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 46 + Math.random() * 14;
      d.data[i] = v;
      d.data[i + 1] = v * 0.82;
      d.data[i + 2] = v * 0.66;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    const ch = H * 0.6;
    const cw = (ch * 63) / 88;
    const draw = () => {
      ctx.drawImage(grain, 0, 0);
      if (showCard) ctx.drawImage(img, (W - cw) / 2, (H - ch) / 2 - H * 0.04, cw, ch);
      requestAnimationFrame(draw);
    };
    draw();
    return cv.captureStream(30);
  };
});

const page = await context.newPage();
page.on("pageerror", (e) => console.log("[page error]", e.message));

async function settle(ms = 1800) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}
async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("capture", name);
}

await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
console.log("connecte, url", page.url());

await page.goto(`${BASE}/home`);
await settle();
await shot("home");

await page.goto(`${BASE}/collection`);
await settle();
const variationPill = page.getByRole("button", { name: /variation/i }).first();
if (await variationPill.count()) {
  await variationPill.click().catch(() => {});
  await page.waitForTimeout(800);
}
await shot("collection");

await page.goto(`${BASE}/scan`);
await page.waitForSelector("video", { timeout: 20000 });
await page.waitForSelector('p[aria-live="polite"]', { timeout: 20000 });
await page.waitForTimeout(600);
await page.evaluate(() => {
  window.__holdShot = true;
  window.__showCard();
});
await page.waitForFunction(() => document.querySelector('p[aria-live="polite"]')?.textContent === "Carte détectée", null, {
  timeout: 10000,
});
await page.evaluate(() => {
  for (const b of document.querySelectorAll("button[disabled]")) b.removeAttribute("disabled");
});
await page.waitForTimeout(250);
await shot("scan");

// La prise retenue part : la photo est l'image de la fausse camera, la carte
// sous le cadre. La scene de reconnaissance est capturee une fois le prix pose.
await page.evaluate(() => {
  window.__holdShot = false;
});
await page.waitForSelector(".price-slam", { timeout: 90000 });
// Le prix qui claque vient de la reponse du scan : on y pose la cote de vitrine, sans centimes comme la scene.
await page.evaluate((text) => {
  const el = document.querySelector(".price-slam");
  if (el) el.textContent = text;
}, new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(SHOWCASE_PRICES["base1-4"].avg30));
await page.waitForTimeout(1250);
await shot("reveal");
await page.waitForSelector(".card-sheet", { timeout: 90000 });
await page.waitForTimeout(3200);
// La fiche affiche la reponse du scan (cotes TCGdex du jour), pas la base :
// les montants reels y sont remplaces, texte par texte, par la cote de vitrine.
{
  const fmt = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
  const pairs = [];
  for (const [cardId, show] of Object.entries(SHOWCASE_PRICES)) {
    const real = savedPrices.find((r) => r.card_id === cardId);
    if (!real) continue;
    const [rw, rr] = fmt(real.avg30).split(",");
    const [sw, sr] = fmt(show.avg30).split(",");
    pairs.push([rw, sw], [rr, sr], [fmt(real.trend), fmt(show.trend)], [fmt(real.low), fmt(show.low)]);
  }
  const variationText = `+${(GROWTH["base1-4"] * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % sur 30 j`;
  const changed = await page.evaluate(({ pairs, variationText }) => {
    const root = document.querySelector(".card-sheet");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      for (const [a, b] of pairs) if (node.nodeValue === a) { node.nodeValue = b; n++; }
    }
    // La variation de la fiche est calculee par le scan sur la vraie cote : on l aligne sur la vitrine.
    for (const p of root.querySelectorAll("p")) {
      const t = p.textContent.trim();
      if (t.includes("% sur ") && t.endsWith(" j")) {
        p.textContent = variationText;
        p.classList.remove("text-down");
        p.classList.add("text-up");
        n++;
      }
    }
    return n;
  }, { pairs, variationText });
  console.log("fiche : montants remplaces", changed);
}
await shot("result");
await applyShowcase();

await page.goto(`${BASE}/u/${profile.username}`);
await settle();
await shot("public");

await browser.close();

for (const name of ["home", "collection", "scan", "reveal", "result", "public"]) {
  const src = `${OUT}/${name}.png`;
  const meta = await sharp(src).metadata();
  await sharp(src).webp({ quality: 84 }).toFile(`${OUT}/${name}.webp`);
  fs.unlinkSync(src);
  console.log(name, `${meta.width}x${meta.height}`, `${Math.round(fs.statSync(`${OUT}/${name}.webp`).size / 1024)} ko`);
}

// Détails agrandis, comme les vignettes zoomées des captures de store.
const CROPS = {
  "zoom-price": ["result", { left: 90, top: 1266, width: 985, height: 440 }],
  // Carte « Details » depuis son bord haut arrondi jusque sous la deuxieme ligne.
  "zoom-details": ["result", { left: 48, top: 1796, width: 1074, height: 620 }],
  "zoom-stats": ["home", { left: 122, top: 960, width: 920, height: 220 }],
  // Premiere ligne de la liste (Drascore, +69,7 %), bordure arrondie comprise.
  "zoom-row": ["collection", { left: 30, top: 880, width: 1110, height: 305 }],
};
for (const [name, [from, region]] of Object.entries(CROPS)) {
  await sharp(`${OUT}/${from}.webp`).extract(region).webp({ quality: 86 }).toFile(`${OUT}/${name}.webp`);
  console.log("detail", name, `${region.width}x${region.height}`);
}

} finally {
  if (fs.existsSync(CARD_FILE)) fs.unlinkSync(CARD_FILE);
  for (const row of savedPrices) {
    const { card_id, ...values } = row;
    await admin.from("card_prices").update(values).eq("card_id", card_id);
  }
  await admin.from("price_history").delete().eq("snapshot_date", HIST_DATE).in("card_id", ids);
  await admin.auth.admin.deleteUser(userId);
  console.log("vraies cotes remises, releves retires, compte jetable supprime");
}
