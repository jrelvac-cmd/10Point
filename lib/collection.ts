import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { resolvePrice, variation30d, type CardPriceRow } from "./pricing";

export type CollectionEntry = {
  id: string;
  quantity: number;
  isHolo: boolean;
  isReverse: boolean;
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
  variationPct: number | null;
};

type Row = {
  id: string;
  quantity: number;
  is_holo: boolean;
  is_reverse: boolean;
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
      `id, quantity, is_holo, is_reverse, added_at,
       pokemon_cards ( id, name, name_fr, set_name, number, set_printed_total,
                       rarity, image_small, image_large,
                       card_prices ( * ) )`,
    )
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  return ((data ?? []) as unknown as Row[]).flatMap((row) => {
    const card = row.pokemon_cards;
    if (!card) return [];

    const priceRow = Array.isArray(card.card_prices)
      ? (card.card_prices[0] ?? null)
      : card.card_prices;

    const price = resolvePrice(priceRow, row.is_reverse);
    const unitPrice = price.trend;

    return [
      {
        id: row.id,
        quantity: row.quantity,
        isHolo: row.is_holo,
        isReverse: row.is_reverse,
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
        variationPct: variation30d(price.trend, price.avg30),
      },
    ];
  });
}
