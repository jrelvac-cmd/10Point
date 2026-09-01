import { createAdminClient } from "./supabase/admin";
import { getCardById, type TcgdexCard } from "./tcgdex";
import { extractPrices, type CardPriceRow } from "./pricing";

const PRICE_TTL_HOURS = 24;

/**
 * Enregistre la carte dans le référentiel et rafraîchit son cache prix.
 * Le snapshot quotidien alimente price_history, qui nous construit un
 * historique interne indépendant de Cardmarket.
 */
export async function cacheCardAndPrices(card: TcgdexCard) {
  const admin = createAdminClient();
  const prices = extractPrices(card);

  const { error: cardError } = await admin.from("pokemon_cards").upsert(
    {
      id: card.id,
      // TCGdex indexe en français : le nom lu sur la carte est celui du
      // référentiel, il n'y a plus de traduction à conserver séparément.
      name: card.name,
      name_fr: card.name,
      set_name: card.setName,
      set_id: card.setId,
      number: card.localId,
      set_printed_total: card.setPrintedTotal,
      rarity: card.rarity,
      image_small: card.imageSmall,
      image_large: card.imageLarge,
    },
    { onConflict: "id", ignoreDuplicates: false },
  );

  // Sans cette remontée, une colonne manquante ferait échouer le scan plus loin
  // avec une erreur incompréhensible (violation de clé étrangère).
  if (cardError) {
    throw new Error(`CARD_CACHE_FAILED: ${cardError.message}`);
  }

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

/** Renvoie le prix en cache s'il est encore valide, sinon rappelle TCGdex. */
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

/**
 * Le scan ne persiste que le candidat affiché. Si l'utilisateur en choisit un
 * autre, la carte n'est pas encore au référentiel : on l'y met ici, faute de
 * quoi la clé étrangère de collection_items rejetterait l'ajout.
 */
export async function ensureCardCached(cardId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pokemon_cards")
    .select("id")
    .eq("id", cardId)
    .maybeSingle();
  if (data) return true;

  const card = await getCardById(cardId).catch(() => null);
  if (!card) return false;

  await cacheCardAndPrices(card);
  return true;
}
