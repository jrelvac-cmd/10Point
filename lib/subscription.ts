import { createAdminClient } from "./supabase/admin";
import { fetchSubscription } from "./lemonsqueezy";
import type { Plan } from "./plans";

export type ProfileSubscription = {
  plan: Plan;
  planExpiresAt: string | null;
  subscriptionId: string | null;
};

/**
 * Relit l'abonnement auprès de Lemon Squeezy si le profil en référence un.
 *
 * Un webhook peut se perdre (indisponibilité, déploiement en cours). Sans ce
 * rattrapage, un utilisateur ayant payé resterait en Free, ou un abonnement
 * résilié garderait ses accès. On ne redescend jamais quelqu'un en Free sur une
 * simple erreur réseau : seule une réponse explicite de Lemon Squeezy fait foi.
 * Un Lifetime n'a rien à réconcilier.
 */
export async function reconcileSubscription(
  userId: string,
  current: ProfileSubscription,
): Promise<ProfileSubscription> {
  if (!current.subscriptionId || current.plan === "lifetime") return current;

  const subscription = await fetchSubscription(current.subscriptionId);
  if (!subscription) return current;

  const nextPlan: Plan = subscription.active ? "pro" : "free";
  const nextExpiry = subscription.active ? subscription.expiresAt : null;

  if (nextPlan === current.plan && nextExpiry === current.planExpiresAt) {
    return current;
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ plan: nextPlan, plan_expires_at: nextExpiry })
    .eq("id", userId);

  return { plan: nextPlan, planExpiresAt: nextExpiry, subscriptionId: current.subscriptionId };
}
