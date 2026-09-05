/**
 * Batterie de tests de bout en bout contre le serveur de dev.
 *
 * Prérequis : `npm run dev` lancé, `.env.local` renseigné (Supabase + Anthropic).
 * Crée deux comptes jetables, exerce l'API et les règles de sécurité, puis
 * nettoie tout. Lancer avec : node scripts/smoke-test.mjs
 */
import fs from "node:fs";
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[2].trim()) process.env[m[1]] = m[2].trim();
}

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REF = new URL(SUPA).hostname.split(".")[0];

const admin = createClient(SUPA, SVC, { auth: { persistSession: false } });

// ---------------------------------------------------------------- utilitaires
const results = [];
let current = "";
function section(name) {
  current = name;
  console.log(`\n== ${name}`);
}
function check(label, ok, detail = "") {
  results.push({ section: current, label, ok });
  console.log(`  ${ok ? "OK " : "KO "} ${label}${detail ? ` — ${detail}` : ""}`);
}

const PASSWORD = "SmokeTest-123!";
const stamp = Date.now().toString(36);

async function createUser(tag) {
  const email = `smoke-${tag}-${stamp}@example.invalid`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username: `smoke_${tag}_${stamp}` },
  });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  const id = data.user.id;
  // Le trigger crée le profil ; on force username_set pour éviter l'onboarding.
  await admin.from("profiles").update({ username_set: true }).eq("id", id);
  const tok = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  }).then((r) => r.json());
  if (!tok.access_token) throw new Error(`login ${tag}: ${JSON.stringify(tok)}`);
  const cookie = `sb-${REF}-auth-token=base64-${Buffer.from(
    JSON.stringify({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + tok.expires_in,
      token_type: "bearer",
      user: tok.user,
    }),
  ).toString("base64")}`;
  const asUser = createClient(SUPA, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${tok.access_token}` } },
  });
  return { id, email, cookie, asUser, username: `smoke_${tag}_${stamp}` };
}

/** Le planificateur Vercel s'authentifie par ce secret ; on l'imite. */
const CRON_HEADERS = process.env.CRON_SECRET
  ? { authorization: `Bearer ${process.env.CRON_SECRET}` }
  : {};

async function api(user, path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...init,
    headers: { ...(user ? { cookie: user.cookie } : {}), ...(init.headers ?? {}) },
  });
  let body = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, location: res.headers.get("location") };
}

/** PNG uni 64x64, sans dépendance : sert d'image « pas une carte ». */
function solidPng(r, g, b) {
  const w = 64, h = 64;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const crcTable = [...Array(256)].map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const cc = Buffer.alloc(4); cc.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, cc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function scan(user, bytes, type, name) {
  const form = new FormData();
  form.append("image", new Blob([bytes], { type }), name);
  return api(user, "/api/scan", { method: "POST", body: form });
}

async function profile(id) {
  const { data } = await admin
    .from("profiles")
    .select("plan, scans_this_month, scans_reset_at, share_collection, notify_price_change")
    .eq("id", id)
    .single();
  return data;
}

// ------------------------------------------------------------------ scénario
const created = { users: [], cardIds: [] };
try {
  section("0. Préparation");
  const ping = await fetch(`${BASE}/login`).then((r) => r.status).catch(() => 0);
  check("serveur de dev joignable", ping === 200, `HTTP ${ping}`);
  if (ping !== 200) throw new Error("serveur injoignable");

  const A = await createUser("a");
  const B = await createUser("b");
  created.users.push(A.id, B.id);
  check("deux comptes de test créés et connectés", true);

  const cardPng = Buffer.from(
    await fetch("https://assets.tcgdex.net/fr/base/base1/4/high.webp").then((r) => r.arrayBuffer()),
  );
  const notCard = solidPng(220, 40, 40);

  // ---------------------------------------------------------------------
  section("1. Routes protégées");
  for (const p of ["/home", "/collection", "/scan", "/parametres"]) {
    const r = await api(null, p);
    check(`${p} anonyme → redirigé vers /login`, r.status === 307 && (r.location ?? "").includes("/login"), `HTTP ${r.status}`);
  }
  for (const p of ["/", "/pricing", "/legal/mentions", "/legal/cgv", "/legal/confidentialite", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml"]) {
    const r = await api(null, p);
    check(`${p} public → 200`, r.status === 200, `HTTP ${r.status}`);
  }
  const r401 = await api(null, "/api/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("POST /api/collection anonyme → 401", r401.status === 401, `HTTP ${r401.status}`);
  const rScanAnon = await scan(null, cardPng, "image/webp", "c.webp");
  check("POST /api/scan anonyme → 401", rScanAnon.status === 401, `HTTP ${rScanAnon.status}`);

  // ---------------------------------------------------------------------
  section("2. Onboarding pseudo");
  await admin.from("profiles").update({ username_set: false }).eq("id", B.id);
  const rOnb = await api(B, "/home");
  check("username_set=false → redirigé vers /choisir-pseudo", rOnb.status === 307 && (rOnb.location ?? "").includes("/choisir-pseudo"), `HTTP ${rOnb.status} → ${rOnb.location}`);
  await admin.from("profiles").update({ username_set: true }).eq("id", B.id);
  const dup = await admin.from("profiles").update({ username: A.username }).eq("id", B.id);
  check("pseudo en doublon refusé par la base", dup.error?.code === "23505", dup.error?.code ?? "aucune erreur");

  // ---------------------------------------------------------------------
  section("3. Scan : identification, prix, quota");
  await admin.from("profiles").update({ plan: "free", scans_this_month: 0 }).eq("id", A.id);
  const s1 = await scan(A, cardPng, "image/webp", "dracaufeu.webp");
  const c1 = s1.body?.cards?.[0];
  check("scan Dracaufeu → 200", s1.status === 200, `HTTP ${s1.status} ${s1.body?.error ?? ""}`);
  check("nom français « Dracaufeu »", c1?.name === "Dracaufeu", c1?.name);
  check("confirmé automatiquement", s1.body?.confirmed === true);
  check("prix en euros > 0", typeof c1?.prices?.normal?.trend === "number" && c1.prices.normal.trend > 0, `${c1?.prices?.normal?.trend} €`);
  check("variantes réelles (holo oui, reverse non)", c1?.variants?.holo === true && c1?.variants?.reverse === false, JSON.stringify(c1?.variants));
  check("reverse sans cote → null, pas 0", c1?.prices?.reverse?.trend === null || c1?.prices?.reverse?.trend > 0);
  check("compteur décrémenté (19 restants)", s1.body?.remaining_scans === 19, String(s1.body?.remaining_scans));
  if (c1?.id) created.cardIds.push(c1.id);

  const s2 = await scan(A, cardPng, "image/webp", "dracaufeu.webp");
  check("re-scan → même prix (cache)", s2.body?.cards?.[0]?.prices?.normal?.trend === c1?.prices?.normal?.trend);

  const before = await profile(A.id);
  const sFail = await scan(A, notCard, "image/png", "rouge.png");
  const after = await profile(A.id);
  check("image sans carte → 400 NOT_A_CARD", sFail.status === 400 && sFail.body?.error === "NOT_A_CARD", `HTTP ${sFail.status} ${sFail.body?.error}`);
  check("scan raté ne consomme pas de quota", after.scans_this_month === before.scans_this_month, `${before.scans_this_month} → ${after.scans_this_month}`);

  const sBig = await scan(A, Buffer.alloc(10 * 1024 * 1024 + 1), "image/png", "gros.png");
  check("image > 10 Mo → refusée avec un code clair (413 ou 400)", [413, 400].includes(sBig.status) && ["TOO_LARGE", "BAD_REQUEST"].includes(sBig.body?.error), `${sBig.status} ${sBig.body?.error}`);
  const sFmt = await scan(A, Buffer.from("x"), "text/plain", "x.txt");
  check("mauvais format → 400 BAD_FORMAT", sFmt.status === 400 && sFmt.body?.error === "BAD_FORMAT", `${sFmt.status} ${sFmt.body?.error}`);

  await admin.from("profiles").update({ scans_this_month: 20 }).eq("id", A.id);
  const sQuota = await scan(A, cardPng, "image/webp", "c.webp");
  check("20 scans consommés → 402 QUOTA_EXCEEDED", sQuota.status === 402, `HTTP ${sQuota.status}`);

  await admin.from("profiles").update({ scans_this_month: 20, scans_reset_at: new Date(Date.now() - 3600e3).toISOString() }).eq("id", A.id);
  const sReset = await scan(A, cardPng, "image/webp", "c.webp");
  const pReset = await profile(A.id);
  check("période écoulée → compteur remis à zéro puis scan accepté", sReset.status === 200 && pReset.scans_this_month === 1, `HTTP ${sReset.status}, compteur=${pReset.scans_this_month}`);
  check("prochaine remise à zéro dans le futur", new Date(pReset.scans_reset_at) > new Date());

  await admin.from("profiles").update({ plan: "pro", scans_this_month: 500 }).eq("id", A.id);
  const sPro = await scan(A, cardPng, "image/webp", "c.webp");
  check("Pro : scans illimités (500 déjà faits → 200)", sPro.status === 200 && sPro.body?.remaining_scans === null, `HTTP ${sPro.status}`);
  await admin.from("profiles").update({ plan: "free", scans_this_month: 5 }).eq("id", A.id);

  // ---------------------------------------------------------------------
  section("4. Collection : ajout, quantité, suppression, limite");
  const cardId = c1.id;
  const add1 = await api(A, "/api/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: cardId, quantity: 2, is_holo: true, is_reverse: false }) });
  check("ajout → 201", add1.status === 201, `HTTP ${add1.status} ${JSON.stringify(add1.body).slice(0, 80)}`);
  const itemId = add1.body?.id;
  const add2 = await api(A, "/api/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: cardId, quantity: 3, is_holo: true, is_reverse: false }) });
  check("même variante → quantités cumulées (2+3=5)", add2.status === 200 && add2.body?.quantity === 5, `qty=${add2.body?.quantity}`);
  const addRev = await api(A, "/api/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: cardId, quantity: 1, is_holo: false, is_reverse: true }) });
  check("autre variante (reverse) → ligne distincte", addRev.status === 201 && addRev.body?.id !== itemId);
  const badQ = await api(A, "/api/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: cardId, quantity: 100 }) });
  check("quantité 100 → 400", badQ.status === 400);
  const badCard = await api(A, "/api/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: "n-existe-pas-000" }) });
  check("carte inconnue → 404", badCard.status === 404, `HTTP ${badCard.status}`);
  const patch = await api(A, `/api/collection/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: 7 }) });
  check("PATCH quantité → 7", patch.status === 200 && patch.body?.quantity === 7);
  const del = await api(A, `/api/collection/${addRev.body?.id}`, { method: "DELETE" });
  const { data: gone } = await admin.from("collection_items").select("id").eq("id", addRev.body?.id).maybeSingle();
  check("DELETE → 204 et ligne disparue", del.status === 204 && !gone);

  // Limite Free : 100 cartes distinctes
  const fakeIds = Array.from({ length: 100 }, (_, i) => `smoke-${stamp}-${i}`);
  created.cardIds.push(...fakeIds);
  await admin.from("pokemon_cards").insert(fakeIds.map((id, i) => ({ id, name: `Carte test ${i}`, set_name: "Set test", number: String(i) })));
  await admin.from("collection_items").delete().eq("user_id", A.id);
  await admin.from("collection_items").insert(fakeIds.map((id) => ({ user_id: A.id, card_id: id, quantity: 1 })));
  const lim = await api(A, "/api/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: cardId, quantity: 1 }) });
  check("Free à 100 cartes → 101e refusée (402 COLLECTION_LIMIT)", lim.status === 402 && lim.body?.error === "COLLECTION_LIMIT", `HTTP ${lim.status}`);
  await admin.from("profiles").update({ plan: "pro" }).eq("id", A.id);
  const limPro = await api(A, "/api/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: cardId, quantity: 1 }) });
  check("Pro → 101e acceptée", limPro.status === 201, `HTTP ${limPro.status}`);
  await admin.from("profiles").update({ plan: "free" }).eq("id", A.id);
  const pageCol = await api(A, "/collection");
  check("Free avec 101 cartes → bandeau « 100 premières » affiché", pageCol.status === 200 && String(pageCol.body).includes("100 premières"), `HTTP ${pageCol.status}`);
  const pageHome = await api(A, "/home");
  check(
    "tableau de bord → 200 avec jauge et variation (fenêtre réelle)",
    pageHome.status === 200 &&
      String(pageHome.body).includes("Ma Collection") &&
      /Variation \d+ j/.test(String(pageHome.body)),
  );
  // Les cartes factices ont servi ; on les retire pour que le cron ne les voie pas.
  await admin.from("collection_items").delete().in("card_id", fakeIds);
  await admin.from("pokemon_cards").delete().in("id", fakeIds);

  // ---------------------------------------------------------------------
  section("5. Isolation entre comptes (RLS)");
  const { data: seenByB } = await B.asUser.from("collection_items").select("id").eq("user_id", A.id);
  check("B ne lit pas les cartes de A", (seenByB ?? []).length === 0, `${(seenByB ?? []).length} ligne(s)`);
  const { data: profA } = await B.asUser.from("profiles").select("id").eq("id", A.id);
  check("B ne lit pas le profil de A", (profA ?? []).length === 0);
  const { data: scansA } = await B.asUser.from("scan_logs").select("id").eq("user_id", A.id);
  check("B ne lit pas les scans de A", (scansA ?? []).length === 0);
  const { data: aItem } = await admin.from("collection_items").select("id").eq("user_id", A.id).limit(1).single();
  const pB = await api(B, `/api/collection/${aItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: 9 }) });
  const { data: stillA } = await admin.from("collection_items").select("quantity").eq("id", aItem.id).single();
  check("B ne modifie pas une carte de A (404, valeur intacte)", pB.status === 404 && stillA.quantity !== 9, `HTTP ${pB.status}`);
  const dB = await api(B, `/api/collection/${aItem.id}`, { method: "DELETE" });
  const { data: stillThere } = await admin.from("collection_items").select("id").eq("id", aItem.id).maybeSingle();
  check("B ne supprime pas une carte de A (ligne conservée)", !!stillThere, `HTTP ${dB.status}`);
  check("DELETE d'autrui répond 404 et non 204", dB.status === 404, `HTTP ${dB.status}`);
  const anonClient = createClient(SUPA, ANON, { auth: { persistSession: false } });
  const { data: anonItems } = await anonClient.from("collection_items").select("id").limit(1);
  const { data: anonProfiles } = await anonClient.from("profiles").select("id").limit(1);
  check("anonyme : aucune collection ni profil lisible", (anonItems ?? []).length === 0 && (anonProfiles ?? []).length === 0);
  const { data: anonCards } = await anonClient.from("pokemon_cards").select("id").limit(1);
  check("anonyme : référentiel cartes lisible (voulu)", (anonCards ?? []).length === 1);
  const { error: anonWrite } = await anonClient.from("pokemon_cards").insert({ id: "hack", name: "hack" });
  check("anonyme : écriture référentiel refusée", !!anonWrite);

  // ---------------------------------------------------------------------
  section("6. Paramètres, partage, page publique");
  const nFree = await api(A, "/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notify_price_change: true }) });
  check("alertes en Free → 402 (contrôle serveur)", nFree.status === 402, `HTTP ${nFree.status}`);
  await admin.from("profiles").update({ plan: "lifetime" }).eq("id", A.id);
  const nPro = await api(A, "/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notify_price_change: true }) });
  check("alertes en Lifetime → 200", nPro.status === 200 && (await profile(A.id)).notify_price_change === true);
  const empty = await api(A, "/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("PATCH vide → 400", empty.status === 400);
  const pubOff = await api(null, `/u/${A.username}`);
  check("partage désactivé → /u/… en 404", pubOff.status === 404, `HTTP ${pubOff.status}`);
  const shareOn = await api(A, "/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ share_collection: true }) });
  const pubOn = await api(null, `/u/${A.username}`);
  check("partage activé → /u/… en 200 avec cartes", shareOn.status === 200 && pubOn.status === 200 && String(pubOn.body).includes("Dracaufeu"), `HTTP ${pubOn.status}`);
  check("page publique sans email ni identifiant", !String(pubOn.body).includes(A.email) && !String(pubOn.body).includes(A.id));
  const pubNone = await api(null, `/u/nexistepas_${stamp}`);
  check("pseudo inconnu → 404", pubNone.status === 404);
  const pSettings = await api(A, "/parametres");
  check("page paramètres → 200, plan affiché « Lifetime »", pSettings.status === 200 && String(pSettings.body).includes("Lifetime"));
  await admin.from("profiles").update({ plan: "free" }).eq("id", A.id);

  // ---------------------------------------------------------------------
  section("7. Paiement et webhooks (sans clés Whop)");
  const ck = await api(A, "/api/checkout?plan=lifetime");
  const configured = Boolean(process.env.WHOP_CHECKOUT_URL_LIFETIME);
  check(
    configured
      ? "checkout → redirige vers Whop avec l'identifiant du compte"
      : "checkout sans URL configurée → retour /pricing avec erreur",
    ck.status === 307 &&
      (configured
        ? (ck.location ?? "").startsWith("https://whop.com/") &&
          (ck.location ?? "").includes(encodeURIComponent(A.id))
        : (ck.location ?? "").includes("paiement_indisponible")),
    `→ ${(ck.location ?? "").slice(0, 90)}`,
  );
  const ckBad = await api(A, "/api/checkout?plan=gratuit");
  check("plan inconnu → /pricing?error=plan_inconnu", (ckBad.location ?? "").includes("plan_inconnu"));
  const ckAnon = await api(null, "/api/checkout?plan=lifetime");
  check("checkout anonyme → /login", ckAnon.status === 307 && (ckAnon.location ?? "").includes("/login"));
  const wh = await api(null, "/api/webhooks/whop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "membership.activated", data: { id: "mem_x", status: "active", user: { email: A.email } } }) });
  const pAfterWh = await profile(A.id);
  check("webhook non signé n'accorde rien (503/401, plan inchangé)", (wh.status === 503 || wh.status === 401) && pAfterWh.plan === "free", `HTTP ${wh.status}, plan=${pAfterWh.plan}`);
  const delReq = await api(A, "/api/account/delete-request", { method: "POST" });
  check("demande de suppression sans Resend → 503 explicite", delReq.status === 503 && delReq.body?.error === "EMAIL_NOT_CONFIGURED", `HTTP ${delReq.status}`);

  // ---------------------------------------------------------------------
  section("8. Cron de rafraîchissement");
  await admin.from("card_prices").update({ cached_at: new Date(Date.now() - 3 * 24 * 3600e3).toISOString() }).eq("card_id", cardId);
  const cron = await api(null, "/api/cron/refresh-prices", { headers: CRON_HEADERS });
  check("cron → 200, carte due rafraîchie, aucun échec", cron.status === 200 && cron.body?.refreshed >= 1 && cron.body?.failed === 0, JSON.stringify(cron.body));
  await admin.from("pokemon_cards").insert({ id: `smoke-${stamp}-ghost`, name: "Fantôme" });
  await admin.from("collection_items").insert({ user_id: A.id, card_id: `smoke-${stamp}-ghost`, quantity: 1 });
  created.cardIds.push(`smoke-${stamp}-ghost`);
  const cron2 = await api(null, "/api/cron/refresh-prices", { headers: CRON_HEADERS });
  const cron3 = await api(null, "/api/cron/refresh-prices", { headers: CRON_HEADERS });
  check("carte absente du référentiel → comptée « unavailable », pas retentée", cron2.body?.unavailable === 1 && cron3.body?.due === 0, `1er: ${JSON.stringify(cron2.body)} 2e: ${JSON.stringify(cron3.body)}`);
  const { data: hist } = await admin.from("price_history").select("snapshot_date").eq("card_id", cardId).eq("snapshot_date", new Date().toISOString().slice(0, 10));
  check("snapshot du jour dans price_history", (hist ?? []).length === 1);
  const { data: fresh } = await admin.from("card_prices").select("cached_at").eq("card_id", cardId).single();
  check("cached_at remis à maintenant", Date.now() - new Date(fresh.cached_at).getTime() < 60_000);

  // ---------------------------------------------------------------------
  section("9. Mode démo");
  const cronNoAuth = await api(null, "/api/cron/refresh-prices");
  check("cron sans le secret → 401", !process.env.CRON_SECRET || cronNoAuth.status === 401, `HTTP ${cronNoAuth.status}`);

  const demo = await api(null, "/api/demo-login", { method: "POST" });
  check("démo activée en local → identifiants renvoyés", demo.status === 200 && demo.body?.email, `HTTP ${demo.status}`);
} catch (e) {
  console.error("\nARRÊT :", e.message);
  results.push({ section: current, label: `exception : ${e.message}`, ok: false });
} finally {
  section("Nettoyage");
  for (const id of created.users) await admin.auth.admin.deleteUser(id).catch(() => {});
  if (created.cardIds.length) {
    const fake = created.cardIds.filter((c) => c.startsWith("smoke-"));
    if (fake.length) {
      await admin.from("collection_items").delete().in("card_id", fake);
      await admin.from("pokemon_cards").delete().in("id", fake);
    }
  }
  console.log("  comptes et cartes de test supprimés");
}

const ko = results.filter((r) => !r.ok);
console.log(`\n${"=".repeat(60)}\n${results.length - ko.length}/${results.length} vérifications réussies`);
if (ko.length) {
  console.log("\nÉCHECS :");
  for (const r of ko) console.log(`  - [${r.section}] ${r.label}`);
  process.exit(1);
}
