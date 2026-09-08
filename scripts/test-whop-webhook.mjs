// Simule un webhook Whop signe, sans passer par un vrai paiement.
//
// Cree un compte jetable, envoie un evenement "membership.went_valid" (comme
// si un essai/achat venait de reussir) puis "membership.went_invalid" (comme
// une resiliation), et verifie a chaque etape que profiles.plan a suivi.
// Le webhook verifie la signature exactement comme le ferait Whop : ce test
// prouve que /api/webhooks/whop fonctionne, independamment de Whop lui-meme.
//
// Usage : node scripts/test-whop-webhook.mjs [url-de-base]
// Par defaut la cible est http://localhost:3000 (le serveur `npm run dev`
// doit tourner). Pour tester en production : node scripts/test-whop-webhook.mjs https://10-point-kappa.vercel.app

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { Webhook } from "standardwebhooks";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[2].trim() && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const SECRET = process.env.WHOP_WEBHOOK_SECRET;
if (!SECRET) throw new Error("WHOP_WEBHOOK_SECRET absent de .env.local");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Whop signe avec les octets bruts du secret ; la bibliotheque de verification
// le redecode depuis du base64. On encode donc ici pour retomber sur les
// memes octets, exactement comme le fait @whop/sdk/helpers en interne.
function hmacKey(secret) {
  return Buffer.from(secret, "utf8").toString("base64");
}

function signedHeaders(body) {
  const id = `msg_test_${Date.now()}`;
  const timestamp = new Date();
  const wh = new Webhook(hmacKey(SECRET));
  const signature = wh.sign(id, timestamp, body);
  return {
    "content-type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": signature,
  };
}

async function sendEvent(type, data) {
  const body = JSON.stringify({ type, data });
  const res = await fetch(`${BASE_URL}/api/webhooks/whop`, {
    method: "POST",
    headers: signedHeaders(body),
    body,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function readProfile(id) {
  const { data } = await admin
    .from("profiles")
    .select("plan, plan_expires_at, whop_membership_id, whop_user_id")
    .eq("id", id)
    .single();
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(`ECHEC : ${message}`);
  console.log(`  ok — ${message}`);
}

const EMAIL = `whop-test-${Date.now()}@example.com`;
const MEMBERSHIP_ID = `mem_test_${Date.now()}`;

console.log(`Cible : ${BASE_URL}`);
console.log(`Compte jetable : ${EMAIL}`);

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: "Whop-Test-1234",
  email_confirm: true,
});
if (createErr) throw createErr;
const userId = created.user.id;

try {
  console.log("\n1) membership.went_valid (essai/achat Pro Mensuel qui reussit)");
  const monthly = await sendEvent("membership.went_valid", {
    id: MEMBERSHIP_ID,
    status: "trialing",
    user: { id: "whop_user_test", email: EMAIL },
    renewal_period_end: "2026-10-08T00:00:00Z",
    metadata: { supabase_user_id: userId },
  });
  console.log(`  reponse ${monthly.status}`, monthly.json);
  assert(monthly.status === 200, "requete signee acceptee (200)");
  let profile = await readProfile(userId);
  assert(profile.plan === "pro", `plan passe a "pro" (lu : "${profile.plan}")`);
  assert(profile.whop_membership_id === MEMBERSHIP_ID, "whop_membership_id enregistre");
  assert(profile.plan_expires_at !== null, "date d'expiration posee (abonnement, pas lifetime)");

  console.log("\n2) membership.went_invalid (resiliation / fin d'essai sans paiement)");
  const cancel = await sendEvent("membership.went_invalid", {
    id: MEMBERSHIP_ID,
    status: "expired",
    user: { id: "whop_user_test", email: EMAIL },
    metadata: { supabase_user_id: userId },
  });
  console.log(`  reponse ${cancel.status}`, cancel.json);
  assert(cancel.status === 200, "requete signee acceptee (200)");
  profile = await readProfile(userId);
  assert(profile.plan === "free", `plan repasse a "free" (lu : "${profile.plan}")`);

  console.log("\n3) signature invalide (quelqu'un sans le secret ne peut pas s'offrir Pro)");
  const forged = await fetch(`${BASE_URL}/api/webhooks/whop`, {
    method: "POST",
    headers: { "content-type": "application/json", "webhook-id": "x", "webhook-timestamp": "0", "webhook-signature": "v1,invalide" },
    body: JSON.stringify({ type: "membership.went_valid", data: { id: "x", status: "active", metadata: { supabase_user_id: userId } } }),
  });
  assert(forged.status === 401, `requete non signee rejetee (recu ${forged.status})`);

  console.log("\nTout est vert : le webhook applique et retire correctement l'acces Pro.");
} finally {
  await admin.auth.admin.deleteUser(userId);
  console.log(`\nCompte jetable ${EMAIL} supprime.`);
}
