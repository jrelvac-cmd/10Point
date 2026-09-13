// Simule un webhook Lemon Squeezy signe, sans passer par un vrai paiement.
//
// Cree un compte jetable, envoie "subscription_created" (comme si un essai
// venait de demarrer), "subscription_expired" (fin sans paiement), puis
// "order_created" Lifetime, et verifie a chaque etape que profiles.plan a suivi.
// Le webhook verifie la signature exactement comme le ferait Lemon Squeezy.
//
// Usage : node scripts/test-lemonsqueezy-webhook.mjs [url-de-base]
// Par defaut la cible est http://localhost:3000 (le serveur `npm run dev`
// doit tourner). En production : node scripts/test-lemonsqueezy-webhook.mjs https://mintcard.app

import fs from "node:fs";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[2].trim() && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
if (!SECRET) throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET absent de .env.local");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function sendEvent(event_name, custom_data, data) {
  const body = JSON.stringify({ meta: { event_name, custom_data }, data });
  const res = await fetch(`${BASE_URL}/api/webhooks/lemonsqueezy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": createHmac("sha256", SECRET).update(body).digest("hex"),
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function readProfile(id) {
  const { data } = await admin
    .from("profiles")
    .select("plan, plan_expires_at, ls_subscription_id, ls_order_id, ls_customer_id")
    .eq("id", id)
    .single();
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(`ECHEC : ${message}`);
  console.log(`  ok — ${message}`);
}

const EMAIL = `ls-test-${Date.now()}@example.com`;
const SUB_ID = String(Date.now());
const ORDER_ID = String(Date.now() + 1);

console.log(`Cible : ${BASE_URL}`);
console.log(`Compte jetable : ${EMAIL}`);

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: "Lemon-Test-1234",
  email_confirm: true,
});
if (createErr) throw createErr;
const userId = created.user.id;
const custom = { supabase_user_id: userId, plan: "monthly" };

try {
  console.log("\n1) subscription_created (essai Pro Mensuel qui demarre)");
  const start = await sendEvent("subscription_created", custom, {
    id: SUB_ID,
    attributes: { status: "on_trial", customer_id: 42, user_email: EMAIL, renews_at: "2026-10-08T00:00:00Z", ends_at: null },
  });
  console.log(`  reponse ${start.status}`, start.json);
  assert(start.status === 200, "requete signee acceptee (200)");
  let profile = await readProfile(userId);
  assert(profile.plan === "pro", `plan passe a "pro" (lu : "${profile.plan}")`);
  assert(profile.ls_subscription_id === SUB_ID, "ls_subscription_id enregistre");
  assert(profile.plan_expires_at !== null, "date d'expiration posee (abonnement, pas lifetime)");

  console.log("\n2) subscription_expired (fin d'essai sans paiement)");
  const end = await sendEvent("subscription_expired", custom, {
    id: SUB_ID,
    attributes: { status: "expired", customer_id: 42, user_email: EMAIL, ends_at: "2026-09-10T00:00:00Z" },
  });
  assert(end.status === 200, "requete signee acceptee (200)");
  profile = await readProfile(userId);
  assert(profile.plan === "free", `plan repasse a "free" (lu : "${profile.plan}")`);

  console.log("\n3) order_created Lifetime (paiement unique)");
  const life = await sendEvent("order_created", { supabase_user_id: userId, plan: "lifetime" }, {
    id: ORDER_ID,
    attributes: { status: "paid", customer_id: 42, user_email: EMAIL },
  });
  assert(life.status === 200, "requete signee acceptee (200)");
  profile = await readProfile(userId);
  assert(profile.plan === "lifetime", `plan passe a "lifetime" (lu : "${profile.plan}")`);
  assert(profile.plan_expires_at === null, "aucune date de fin pour un Lifetime");

  console.log("\n4) signature invalide (quelqu'un sans le secret ne peut pas s'offrir Pro)");
  const forged = await fetch(`${BASE_URL}/api/webhooks/lemonsqueezy`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": "deadbeef" },
    body: JSON.stringify({ meta: { event_name: "subscription_created", custom_data: custom }, data: { id: "9", attributes: { status: "active" } } }),
  });
  assert(forged.status === 401, `requete mal signee rejetee (recu ${forged.status})`);

  console.log("\nTout est vert : le webhook applique et retire correctement l'acces Pro.");
} finally {
  await admin.auth.admin.deleteUser(userId);
  console.log(`\nCompte jetable ${EMAIL} supprime.`);
}
