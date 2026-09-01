import { createAdminClient } from "./supabase/admin";
import { getCardById, type PokeTcgCard } from "./poketcg";
import { extractPrices, type CardPriceRow } from "./pricing";

const PRICE_TTL_HOURS = 24;

/**
 * Enregistre la carte dans le référentiel et rafraîchit son cache prix.
 * Le snapshot quotidien alimente price_history, qui nous construit un
 * historique interne indépendant de Cardmarket.
 */
export async function cacheCardAndPrices(card: PokeTcgCard, nameFr?: string | null) {
  const admin = createAdminClient();
  const prices = extractPrices(card);

  await admin.from("pokemon_cards").upsert(
    {
      id: card.id,
      name: card.name,
      name_fr: nameFr ?? null,
      set_name: card.set.name,
      set_id: card.set.id,
      number: card.number,
      set_printed_total: card.set.printedTotal ?? card.set.total ?? null,
      rarity: card.rarity ?? null,
      image_small: card.images.small,
      image_large: card.images.large,
    },
    { onConflict: "id", ignoreDuplicates: false },
  );

  const expiresAt = new Date(Date.now() + PRICE_TTL_HOURS * 3600_000).toISOString();

  await admin.from("card_prices").upsert(
    { ...prices, cached_at: new Date().toISOString(), expires_at: expiresAt },
    { onConflict: "card_id" },
  );

  await admin.from("price_history").upsert(
    {
      card_id: card.id,
      trend: prices.trend,
      avg30: prices.avg30,
      reverse_trend: prices.reverse_trend,
      reverse_avg30: prices.reverse_avg30,
      snapshot_date: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "card_id,snapshot_date" },
  );

  return prices;
}

/** Renvoie le prix en cache s'il est encore valide, sinon rappelle PokéTCG. */
export async function getFreshPrices(cardId: string): Promise<CardPriceRow | null> {
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from("card_prices")
    .select("*")
    .eq("card_id", cardId)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return cached as CardPriceRow;
  }

  const card = await getCardById(cardId);
  if (!card) return (cached as CardPriceRow) ?? null;

  return cacheCardAndPrices(card);
}
