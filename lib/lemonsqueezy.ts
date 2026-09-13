import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plan } from "./plans";

/** Les trois offres payantes, telles que créées dans le tableau de bord Lemon Squeezy. */
export type PaidPlanKey = "monthly" | "yearly" | "lifetime";

export const PAID_PLANS: Record<
  PaidPlanKey,
  { label: string; price: string; period: string; plan: Exclude<Plan, "free"> }
> = {
  monthly: { label: "Pro Mensuel", price: "3,99 €", period: "/mois", plan: "pro" },
  yearly: { label: "Pro Annuel", price: "24,99 €", period: "/an", plan: "pro" },
  lifetime: { label: "Lifetime", price: "59,99 €", period: " une fois", plan: "lifetime" },
};

const API = "https://api.lemonsqueezy.com/v1";

/**
 * Lien de paiement hébergé, copié depuis le tableau de bord (Produits → Partager).
 * Configuré plutôt que construit : l'identifiant du lien n'est pas celui de la
 * variante, et une URL devinée casserait silencieusement les paiements.
 */
export function checkoutUrlFor(key: PaidPlanKey): string | null {
  const urls: Record<PaidPlanKey, string | undefined> = {
    monthly: process.env.LEMONSQUEEZY_CHECKOUT_URL_MONTHLY,
    yearly: process.env.LEMONSQUEEZY_CHECKOUT_URL_YEARLY,
    lifetime: process.env.LEMONSQUEEZY_CHECKOUT_URL_LIFETIME,
  };
  return urls[key] ?? null;
}

/**
 * Statuts d'abonnement qui donnent effectivement accès.
 *
 * « on_trial » : l'essai de 7 jours ouvre les fonctions Pro. « cancelled » :
 * l'abonnement résilié reste actif jusqu'à la fin de la période déjà payée
 * (Lemon Squeezy le passe ensuite en « expired »). « past_due » : le
 * prélèvement a échoué mais Lemon Squeezy le retente pendant plusieurs jours.
 */
const ACTIVE_STATUSES = new Set(["on_trial", "active", "past_due", "cancelled"]);

export function isActiveStatus(status: string | null | undefined): boolean {
  return status ? ACTIVE_STATUSES.has(status) : false;
}

/**
 * Chaque livraison porte, dans l'en-tête X-Signature, le HMAC-SHA256 du corps
 * brut avec le secret de signature. Comparaison à temps constant.
 */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type ResolvedSubscription = {
  subscriptionId: string;
  customerId: string | null;
  email: string | null;
  active: boolean;
  expiresAt: string | null;
};

/** Met à plat les attributs d'un abonnement, tels que renvoyés par l'API ou un webhook. */
export function normalizeSubscription(
  id: string | null,
  attributes: Record<string, unknown>,
): ResolvedSubscription | null {
  if (!id) return null;
  const status = typeof attributes.status === "string" ? attributes.status : null;
  // Résilié : l'accès court jusqu'à ends_at ; sinon jusqu'au prochain prélèvement.
  const end =
    typeof attributes.ends_at === "string"
      ? attributes.ends_at
      : typeof attributes.renews_at === "string"
        ? attributes.renews_at
        : null;
  return {
    subscriptionId: id,
    customerId: attributes.customer_id != null ? String(attributes.customer_id) : null,
    email: typeof attributes.user_email === "string" ? attributes.user_email : null,
    active: isActiveStatus(status),
    expiresAt: end,
  };
}

async function apiGet(path: string): Promise<Record<string, unknown> | null> {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Record<string, unknown> };
    return json.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Relit l'état d'un abonnement auprès de Lemon Squeezy. Sert de filet quand un
 * webhook s'est perdu : sans cette réconciliation, un utilisateur ayant payé
 * pourrait rester bloqué en Free.
 */
export async function fetchSubscription(subscriptionId: string): Promise<ResolvedSubscription | null> {
  const data = await apiGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (!data) return null;
  const id = typeof data.id === "string" ? data.id : null;
  return normalizeSubscription(id, (data.attributes ?? {}) as Record<string, unknown>);
}

/**
 * Espace client signé, valable 24 h, où l'abonné change de carte ou résilie.
 * Lemon Squeezy le génère par abonnement ; on le demande au moment du clic.
 */
export async function customerPortalUrl(subscriptionId: string): Promise<string | null> {
  const data = await apiGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const urls = (data?.attributes as Record<string, unknown> | undefined)?.urls as
    | Record<string, unknown>
    | undefined;
  return typeof urls?.customer_portal === "string" ? urls.customer_portal : null;
}
