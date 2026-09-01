import { NextResponse } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMembership, type ResolvedMembership } from "@/lib/whop";

/**
 * Whop signe chaque livraison (spécification Standard Webhooks). Sans cette
 * vérification, n'importe qui pourrait appeler cette route et s'offrir un accès
 * Pro : la signature est donc obligatoire, jamais optionnelle.
 */
export async function POST(request: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[whop] WHOP_WEBHOOK_SECRET absent : webhook refusé");
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  }

  // La signature couvre les octets exacts reçus : lire en JSON les modifierait
  // et ferait échouer la vérification.
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = unwrapWebhook(rawBody, { headers, key: secret });
  } catch {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  const type = event.type ?? "";
  if (!type.startsWith("membership.")) {
    // Événement non pertinent : on acquitte pour que Whop cesse de le renvoyer.
    return NextResponse.json({ received: true });
  }

  const membership = normalizeMembership(event.data ?? {});
  if (!membership) return NextResponse.json({ received: true });

  const applied = await applyMembership(membership, event.data ?? {});
  return NextResponse.json({ received: true, applied });
}

/**
 * Rattache l'abonnement au bon profil. Deux pistes, dans cet ordre :
 * l'identifiant que nous avons transmis au checkout, puis l'adresse e-mail.
 * L'e-mail sert de secours car le passage de métadonnées dépend de la
 * configuration du checkout côté Whop.
 */
async function applyMembership(
  membership: ResolvedMembership,
  raw: Record<string, unknown>,
): Promise<boolean> {
  const admin = createAdminClient();

  const metadata = (raw.metadata ?? {}) as Record<string, unknown>;
  const supabaseUserId =
    typeof metadata.supabase_user_id === "string" ? metadata.supabase_user_id : null;

  let profileId: string | null = null;

  if (supabaseUserId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("id", supabaseUserId)
      .maybeSingle();
    profileId = data?.id ?? null;
  }

  // Déjà rattaché lors d'un événement précédent.
  if (!profileId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("whop_membership_id", membership.membershipId)
      .maybeSingle();
    profileId = data?.id ?? null;
  }

  if (!profileId && membership.email) {
    const { data } = await admin.auth.admin.listUsers();
    const match = data?.users.find(
      (u) => u.email?.toLowerCase() === membership.email?.toLowerCase(),
    );
    profileId = match?.id ?? null;
  }

  if (!profileId) {
    console.error(
      `[whop] abonnement ${membership.membershipId} sans profil correspondant`,
    );
    return false;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      plan: membership.active ? membership.plan : "free",
      // Lifetime : pas de date de fin.
      plan_expires_at:
        membership.active && membership.plan !== "lifetime" ? membership.expiresAt : null,
      whop_membership_id: membership.membershipId,
      whop_user_id: membership.whopUserId,
    })
    .eq("id", profileId);

  if (error) {
    console.error(`[whop] mise à jour du profil échouée : ${error.message}`);
    return false;
  }

  return true;
}
