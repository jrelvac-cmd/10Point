import { WhopClient } from "@whop/sdk";
import type { Plan } from "./plans";

/** Les trois offres payantes, telles que créées dans le tableau de bord Whop. */
export type PaidPlanKey = "monthly" | "yearly" | "lifetime";

export const PAID_PLANS: Record<
  PaidPlanKey,
  { label: string; price: string; period: string; plan: Exclude<Plan, "free"> }
> = {
  monthly: { label: "Pro Mensuel", price: "3,99 €", period: "/mois", plan: "pro" },
  yearly: { label: "Pro Annuel", price: "24,99 €", period: "/an", plan: "pro" },
  lifetime: { label: "Lifetime", price: "59,99 €", period: " une fois", plan: "lifetime" },
};

/**
 * URL de paiement hébergée, copiée depuis le tableau de bord Whop.
 * Elle est configurée plutôt que construite : la documentation Whop ne garantit
 * aucun format d'URL stable, et une URL devinée casserait silencieusement les
 * paiements.
 */
export function checkoutUrlFor(key: PaidPlanKey): string | null {
  const urls: Record<PaidPlanKey, string | undefined> = {
    monthly: process.env.WHOP_CHECKOUT_URL_MONTHLY,
    yearly: process.env.WHOP_CHECKOUT_URL_YEARLY,
    lifetime: process.env.WHOP_CHECKOUT_URL_LIFETIME,
  };
  return urls[key] ?? null;
}

/**
 * Statuts Whop qui donnent effectivement accès.
 *
 * « trialing » en fait partie : l'essai de 7 jours doit ouvrir les fonctions
 * Pro. « canceling » aussi, car l'abonnement reste actif jusqu'à la fin de la
 * période déjà payée. « completed » est le statut d'un achat unique dont le
 * paiement est allé au bout — c'est précisément le cas du Lifetime, qui
 * perdrait son accès s'il en était exclu.
 */
const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "canceling",
  "past_due",
  "completed",
]);

export function isActiveStatus(status: string | null | undefined): boolean {
  return status ? ACTIVE_STATUSES.has(status) : false;
}

export function whopClient(): WhopClient | null {
  const token = process.env.WHOP_API_KEY;
  if (!token) return null;
  return new WhopClient({ token });
}

export type ResolvedMembership = {
  membershipId: string;
  whopUserId: string | null;
  email: string | null;
  plan: Plan;
  active: boolean;
  expiresAt: string | null;
};

/**
 * Distingue un accès à vie d'un abonnement.
 *
 * Déduit de la donnée elle-même plutôt que d'un identifiant de plan à
 * configurer : un abonnement a toujours une fin de période de facturation, un
 * achat unique n'en a aucune. Une variable d'environnement oubliée ou erronée
 * aurait silencieusement rétrogradé les acheteurs Lifetime en abonnés.
 */
function planFromMembership(raw: Record<string, unknown>): Plan {
  const hasRenewal =
    typeof raw.renewal_period_end === "string" && raw.renewal_period_end.length > 0;
  return hasRenewal ? "pro" : "lifetime";
}

/**
 * Relit l'état d'un abonnement auprès de Whop. Sert de filet quand un webhook
 * s'est perdu : sans cette réconciliation, un utilisateur ayant payé pourrait
 * rester bloqué en Free.
 */
export async function fetchMembership(
  membershipId: string,
): Promise<ResolvedMembership | null> {
  const client = whopClient();
  if (!client) return null;

  try {
    const m = await client.memberships.retrieve({ id: membershipId });
    return normalizeMembership(m as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Met la réponse Whop à plat, sans dépendre de la forme exacte du SDK. */
export function normalizeMembership(raw: Record<string, unknown>): ResolvedMembership | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;

  const status = typeof raw.status === "string" ? raw.status : null;
  const user = (raw.user ?? {}) as Record<string, unknown>;

  // Lifetime : Whop ne renvoie pas de fin de période.
  const end =
    typeof raw.renewal_period_end === "string" ? raw.renewal_period_end : null;

  return {
    membershipId: id,
    whopUserId: typeof user.id === "string" ? user.id : null,
    email: typeof user.email === "string" ? user.email : null,
    plan: planFromMembership(raw),
    active: isActiveStatus(status),
    expiresAt: end,
  };
}
