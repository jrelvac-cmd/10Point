import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron-auth";
import { getCardById } from "@/lib/tcgdex";
import { cacheCardAndPrices } from "@/lib/cards";

export const maxDuration = 60;

/**
 * Rafraîchit les cotes des cartes réellement détenues par quelqu'un.
 *
 * Les cartes d'un compte payant sont rafraîchies au bout de 24 h, celles d'un
 * compte gratuit au bout de 48 h. Seules les cartes présentes dans au moins une
 * collection sont traitées : rafraîchir tout le référentiel gaspillerait le
 * quota d'exécution sans bénéfice.
 */
const PRO_HOURS = 24;
const FREE_HOURS = 48;
const MAX_CARDS_PER_RUN = 120;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: owned, error } = await admin
    .from("collection_items")
    .select("card_id, profiles!inner(plan)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Une même carte peut appartenir à plusieurs personnes : c'est le plan le
  // plus exigeant qui fixe la fraîcheur attendue.
  const staleness = new Map<string, number>();
  for (const row of (owned ?? []) as unknown as {
    card_id: string;
    profiles: { plan: string } | { plan: string }[];
  }[]) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const hours = profile?.plan === "free" ? FREE_HOURS : PRO_HOURS;
    const current = staleness.get(row.card_id);
    staleness.set(row.card_id, current === undefined ? hours : Math.min(current, hours));
  }

  if (staleness.size === 0) {
    return NextResponse.json({ checked: 0, refreshed: 0, failed: 0 });
  }

  const { data: prices } = await admin
    .from("card_prices")
    .select("card_id, cached_at")
    .in("card_id", [...staleness.keys()]);

  const cachedAt = new Map(
    (prices ?? []).map((p) => [p.card_id as string, p.cached_at as string]),
  );

  const now = Date.now();
  const due = [...staleness.entries()]
    .filter(([cardId, hours]) => {
      const at = cachedAt.get(cardId);
      if (!at) return true; // jamais mis en cache
      return now - new Date(at).getTime() >= hours * 3600_000;
    })
    .map(([cardId]) => cardId)
    .slice(0, MAX_CARDS_PER_RUN);

  let refreshed = 0;
  let failed = 0;
  let unavailable = 0;

  // Séquentiel et volontairement modeste : l'API TCGdex est gratuite, inutile
  // de la marteler. Les cartes non traitées le seront à l'exécution suivante.
  for (const cardId of due) {
    try {
      const card = await getCardById(cardId);
      if (!card) {
        // Carte retirée du référentiel : on date le cache pour ne la
        // retenter qu'après le délai normal, sinon elle échouerait à chaque
        // exécution et masquerait les vraies pannes.
        unavailable++;
        await admin
          .from("card_prices")
          .upsert({ card_id: cardId, cached_at: new Date().toISOString() }, { onConflict: "card_id" });
        continue;
      }
      await cacheCardAndPrices(card);
      refreshed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    checked: staleness.size,
    due: due.length,
    refreshed,
    unavailable,
    failed,
  });
}
