import { createAdminClient } from "./supabase/admin";
import { fetchMembership } from "./whop";
import type { Plan } from "./plans";

export type ProfileSubscription = {
  plan: Plan;
  planExpiresAt: string | null;
  whopMembershipId: string | null;
};

/**
 * Relit l'abonnement auprès de Whop si le profil en référence un.
 *
 * Un webhook peut se perdre (indisponibilité, déploiement en cours). Sans ce
 * rattrapage, un utilisateur ayant payé resterait en Free, ou un abonnement
 * résilié garderait ses accès. On ne redescend jamais quelqu'un en Free sur une
 * simple erreur réseau : seule une réponse explicite de Whop fait foi.
 */
export async function reconcileSubscription(
  userId: string,
  current: ProfileSubscription,
): Promise<ProfileSubscription> {
  if (!current.whopMembershipId) return current;

  const membership = await fetchMembership(current.whopMembershipId);
  if (!membership) return current;

  const nextPlan: Plan = membership.active ? membership.plan : "free";
  const nextExpiry =
    membership.active && membership.plan !== "lifetime" ? membership.expiresAt : null;

  if (nextPlan === current.plan && nextExpiry === current.planExpiresAt) {
    return current;
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ plan: nextPlan, plan_expires_at: nextExpiry })
    .eq("id", userId);

  return {
    plan: nextPlan,
    planExpiresAt: nextExpiry,
    whopMembershipId: current.whopMembershipId,
  };
}
