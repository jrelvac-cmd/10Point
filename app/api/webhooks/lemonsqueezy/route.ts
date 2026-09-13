import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeSubscription,
  verifySignature,
  type ResolvedSubscription,
} from "@/lib/lemonsqueezy";

type WebhookPayload = {
  meta?: { event_name?: string; custom_data?: Record<string, unknown> };
  data?: { id?: string; attributes?: Record<string, unknown> };
};

/**
 * Lemon Squeezy signe chaque livraison (HMAC du corps brut). Sans cette
 * vérification, n'importe qui pourrait appeler cette route et s'offrir un accès
 * Pro : la signature est donc obligatoire, jamais optionnelle.
 */
export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[lemonsqueezy] LEMONSQUEEZY_WEBHOOK_SECRET absent : webhook refusé");
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  }

  // La signature couvre les octets exacts reçus : lire en JSON les modifierait
  // et ferait échouer la vérification.
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const event = payload.meta?.event_name ?? "";
  const custom = payload.meta?.custom_data ?? {};
  const id = typeof payload.data?.id === "string" ? payload.data.id : null;
  const attributes = payload.data?.attributes ?? {};
  const supabaseUserId =
    typeof custom.supabase_user_id === "string" ? custom.supabase_user_id : null;

  if (event.startsWith("subscription_")) {
    const subscription = normalizeSubscription(id, attributes);
    if (!subscription) return NextResponse.json({ received: true });
    const applied = await applySubscription(subscription, supabaseUserId);
    return NextResponse.json({ received: true, applied });
  }

  // Les commandes ne nous intéressent que pour le Lifetime : celles d'un
  // abonnement sont suivies par les événements subscription_*.
  if ((event === "order_created" || event === "order_refunded") && custom.plan === "lifetime" && id) {
    const applied = await applyLifetimeOrder(id, attributes, supabaseUserId, event === "order_refunded");
    return NextResponse.json({ received: true, applied });
  }

  // Événement non pertinent : on acquitte pour que Lemon Squeezy cesse de le renvoyer.
  return NextResponse.json({ received: true });
}

/**
 * Rattache l'abonnement au bon profil. Trois pistes, dans cet ordre :
 * l'identifiant que nous avons transmis au checkout, l'abonnement déjà lié
 * lors d'un événement précédent, puis l'adresse e-mail en secours.
 */
async function findProfile(
  supabaseUserId: string | null,
  linkedColumn: "ls_subscription_id" | "ls_order_id",
  linkedId: string,
  email: string | null,
): Promise<string | null> {
  const admin = createAdminClient();

  if (supabaseUserId) {
    const { data } = await admin.from("profiles").select("id").eq("id", supabaseUserId).maybeSingle();
    if (data?.id) return data.id;
  }

  const { data: linked } = await admin
    .from("profiles")
    .select("id")
    .eq(linkedColumn, linkedId)
    .maybeSingle();
  if (linked?.id) return linked.id;

  if (email) {
    const { data } = await admin.auth.admin.listUsers();
    const match = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match?.id) return match.id;
  }

  return null;
}

async function applySubscription(
  subscription: ResolvedSubscription,
  supabaseUserId: string | null,
): Promise<boolean> {
  const admin = createAdminClient();
  const profileId = await findProfile(
    supabaseUserId,
    "ls_subscription_id",
    subscription.subscriptionId,
    subscription.email,
  );
  if (!profileId) {
    console.error(`[lemonsqueezy] abonnement ${subscription.subscriptionId} sans profil correspondant`);
    return false;
  }

  // Un abonnement ne peut rétrograder un profil que s'il est celui qui lui
  // donne accès. Sans cette règle, un tiers pourrait souscrire un essai en
  // désignant un autre compte, puis le résilier pour faire tomber la victime
  // en Free. Un Lifetime n'est jamais rétrogradé par un abonnement.
  const { data: current } = await admin
    .from("profiles")
    .select("plan, ls_subscription_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!subscription.active) {
    const linked = current?.ls_subscription_id ?? null;
    if (current?.plan === "lifetime" || (linked && linked !== subscription.subscriptionId)) {
      console.warn(`[lemonsqueezy] ${subscription.subscriptionId} inactif ignoré : le profil n'en dépend pas`);
      return false;
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      plan: subscription.active ? "pro" : "free",
      plan_expires_at: subscription.active ? subscription.expiresAt : null,
      ls_subscription_id: subscription.subscriptionId,
      ls_customer_id: subscription.customerId,
    })
    .eq("id", profileId);

  if (error) {
    console.error(`[lemonsqueezy] mise à jour du profil échouée : ${error.message}`);
    return false;
  }
  return true;
}

async function applyLifetimeOrder(
  orderId: string,
  attributes: Record<string, unknown>,
  supabaseUserId: string | null,
  refunded: boolean,
): Promise<boolean> {
  const admin = createAdminClient();
  const email = typeof attributes.user_email === "string" ? attributes.user_email : null;
  const status = typeof attributes.status === "string" ? attributes.status : null;
  const paid = !refunded && status === "paid";

  const profileId = await findProfile(supabaseUserId, "ls_order_id", orderId, email);
  if (!profileId) {
    console.error(`[lemonsqueezy] commande ${orderId} sans profil correspondant`);
    return false;
  }

  if (!paid) {
    // Seule la commande qui a donné l'accès à vie peut le retirer.
    const { data: current } = await admin
      .from("profiles")
      .select("ls_order_id")
      .eq("id", profileId)
      .maybeSingle();
    if (current?.ls_order_id && current.ls_order_id !== orderId) return false;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      plan: paid ? "lifetime" : "free",
      plan_expires_at: null,
      ls_order_id: orderId,
      ls_customer_id: attributes.customer_id != null ? String(attributes.customer_id) : null,
    })
    .eq("id", profileId);

  if (error) {
    console.error(`[lemonsqueezy] mise à jour du profil échouée : ${error.message}`);
    return false;
  }
  return true;
}
