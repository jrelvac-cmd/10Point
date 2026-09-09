import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import {
  resolvePrice,
  referenceValue,
  isVolatile,
  variationFromHistory,
  VARIATION_WINDOW_DAYS,
  type CardPriceRow,
  type PriceVariation,
} from "./pricing";

export type CollectionEntry = {
  id: string;
  quantity: number;
  isHolo: boolean;
  isReverse: boolean;
  isFirstEdition: boolean;
  addedAt: string;
  card: {
    id: string;
    name: string;
    setName: string | null;
    number: string | null;
    setPrintedTotal: number | null;
    rarity: string | null;
    imageSmall: string | null;
    imageLarge: string | null;
  };
  unitPrice: number | null;
  lineValue: number | null;
  variation: PriceVariation | null;
  /** Marché mince pour cette carte : la statistique du dernier jour s'écarte fortement de la référence. */
  volatile: boolean;
};

type Row = {
  id: string;
  quantity: number;
  is_holo: boolean;
  is_reverse: boolean;
  is_first_edition: boolean;
  added_at: string;
  pokemon_cards: {
    id: string;
    name: string;
    name_fr: string | null;
    set_name: string | null;
    number: string | null;
    set_printed_total: number | null;
    rarity: string | null;
    image_small: string | null;
    image_large: string | null;
    card_prices: CardPriceRow | CardPriceRow[] | null;
  } | null;
};

/**
 * Charge la collection avec le prix applicable à chaque ligne. Le prix dépend
 * de la variante possédée : une reverse ne vaut pas le même tarif que la carte
 * normale, d'où le choix de colonne au moment de la lecture.
 */
export async function getCollection(userId: string): Promise<CollectionEntry[]> {
  const supabase = await createClient();
  return loadCollection(supabase, userId);
}

/**
 * Variante pour la page publique. Elle passe par un client service-role car un
 * visiteur anonyme ne peut, par conception, lire ni la table profiles ni les
 * collections d'autrui. La sélection reste volontairement étroite et le code
 * ne s'exécute que côté serveur : la clé n'atteint jamais le navigateur.
 */
export async function getPublicCollection(
  admin: SupabaseClient,
  userId: string,
): Promise<CollectionEntry[]> {
  return loadCollection(admin, userId);
}

async function loadCollection(
  supabase: SupabaseClient,
  userId: string,
): Promise<CollectionEntry[]> {
  const { data } = await supabase
    .from("collection_items")
    .select(
      `id, quantity, is_holo, is_reverse, is_first_edition, added_at,
       pokemon_cards ( id, name, name_fr, set_name, number, set_printed_total,
                       rarity, image_small, image_large,
                       card_prices ( * ) )`,
    )
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];
  const history = await loadHistory(
    supabase,
    rows.flatMap((r) => (r.pokemon_cards ? [r.pokemon_cards.id] : [])),
  );

  return rows.flatMap((row) => {
    const card = row.pokemon_cards;
    if (!card) return [];

    const priceRow = Array.isArray(card.card_prices)
      ? (card.card_prices[0] ?? null)
      : card.card_prices;

    const price = resolvePrice(priceRow, row.is_reverse, row.is_first_edition);
    const unitPrice = referenceValue(price);

    return [
      {
        id: row.id,
        quantity: row.quantity,
        isHolo: row.is_holo,
        isReverse: row.is_reverse,
        isFirstEdition: row.is_first_edition,
        addedAt: row.added_at,
        card: {
          id: card.id,
          name: card.name_fr ?? card.name,
          setName: card.set_name,
          number: card.number,
          setPrintedTotal: card.set_printed_total,
          rarity: card.rarity,
          imageSmall: card.image_small,
          imageLarge: card.image_large,
        },
        unitPrice,
        lineValue: unitPrice === null ? null : unitPrice * row.quantity,
        // La variation suit la même base que le chiffre affiché : comparer un
        // avant/après en tendance quand l'écran montre la moyenne 30 jours
        // aurait remis le bruit qu'on vient d'en sortir.
        variation: variationFromHistory(
          unitPrice,
          (history.get(card.id) ?? []).map((h) => ({
            date: h.date,
            value: row.is_first_edition
              ? (h.firstEditionAvg30 ?? h.firstEditionTrend)
              : row.is_reverse
                ? (h.reverseAvg30 ?? h.reverse)
                : (h.avg30 ?? h.trend),
          })),
        ),
        volatile: isVolatile(price),
      },
    ];
  });
}

type HistoryRow = {
  date: string;
  trend: number | null;
  reverse: number | null;
  avg30: number | null;
  reverseAvg30: number | null;
  firstEditionTrend: number | null;
  firstEditionAvg30: number | null;
};

/** Instantanés quotidiens des cartes demandées, sur la fenêtre de variation. */
async function loadHistory(
  supabase: SupabaseClient,
  cardIds: string[],
): Promise<Map<string, HistoryRow[]>> {
  const map = new Map<string, HistoryRow[]>();
  if (!cardIds.length) return map;
  const floor = new Date(Date.now() - VARIATION_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data } = await supabase
    .from("price_history")
    .select(
      "card_id, snapshot_date, trend, reverse_trend, avg30, reverse_avg30, first_edition_trend, first_edition_avg30",
    )
    .in("card_id", [...new Set(cardIds)])
    .gte("snapshot_date", floor);
  for (const h of data ?? []) {
    const list = map.get(h.card_id) ?? [];
    list.push({
      date: h.snapshot_date,
      trend: h.trend,
      reverse: h.reverse_trend,
      avg30: h.avg30,
      reverseAvg30: h.reverse_avg30,
      firstEditionTrend: h.first_edition_trend,
      firstEditionAvg30: h.first_edition_avg30,
    });
    map.set(h.card_id, list);
  }
  return map;
}
