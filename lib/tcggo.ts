import { createAdminClient } from "./supabase/admin";
import type { TcgdexCard } from "./tcgdex";

/**
 * Cote « carte française » d'après Cardmarket, lue via l'API TCGGO (RapidAPI) :
 * l'annonce la moins chère en français, état near mint.
 *
 * Le guide de prix Cardmarket que renvoie TCGdex mélange toutes les langues ;
 * ici on ne lit que la version française. Sans clé, tout ce module est inerte
 * et l'application garde la cote toutes langues.
 */

export type FrPriceSource = "tcggo";

export type FrPriceRow = {
  card_id: string;
  price: number | null;
  low: number | null;
  high: number | null;
  sample_count: number;
  window_days: number;
  source: FrPriceSource;
  sampled_at: string;
  expires_at: string;
};

const BASE = "https://cardmarket-api-tcg.p.rapidapi.com";
const HOST = "cardmarket-api-tcg.p.rapidapi.com";
const TTL_HOURS = 24;
const API_TIMEOUT_MS = 6_000;
/** Limite de l'API pour une recherche groupée par identifiants. */
const MAX_IDS = 20;
/**
 * Une annonce française isolée peut être très au-dessus du marché (500 € pour
 * une carte à 107 € de moyenne) : au-delà du double de la moyenne 30 jours
 * toutes langues, ce n'est pas une cote, on l'ignore.
 */
const OUTLIER_FACTOR = 2;

export function tcggoConfigured(): boolean {
  return Boolean(process.env.TCGGO_RAPIDAPI_KEY);
}

/** Sets dont l'identifiant pokemontcg.io ne suit pas la règle générale. */
const SET_EXCEPTIONS: Record<string, string> = {
  "swsh4.5": "swsh45",
  "swsh4.5sv": "swsh45sv",
  "swsh3.5": "swsh35",
  "swsh10.5": "pgo",
  "sm3.5": "sm35",
  "sm7.5": "sm75",
  "sv10.5b": "zsv10pt5",
  "sv10.5w": "rsv10pt5",
};

/**
 * Identifiant pokemontcg.io attendu par TCGGO, déduit de l'identifiant TCGdex.
 * Identiques pour les sets classiques ; TCGdex complète le numéro de set par
 * un zéro (sv03) et écrit les demi-sets « .5 » là où pokemontcg écrit « pt5 ».
 */
export function toTcgid(id: string): string {
  const dash = id.lastIndexOf("-");
  if (dash < 0) return id;
  const set = id.slice(0, dash);
  const mapped =
    SET_EXCEPTIONS[set] ?? set.replace(/^([a-z]+)0+(?=\d)/, "$1").replace(".5", "pt5");
  return `${mapped}${id.slice(dash)}`;
}

type TcggoResponse = {
  data?: { tcgid?: string; prices?: { cardmarket?: Record<string, unknown> } }[];
};

/** Cote française retenue par carte, réassociée à l'identifiant TCGdex demandé. */
export function readFrPrices(json: TcggoResponse, ids: string[]): Map<string, number | null> {
  const byTcgid = new Map(ids.map((id) => [toTcgid(id), id]));
  const result = new Map<string, number | null>(ids.map((id) => [id, null]));
  for (const card of json.data ?? []) {
    const id = card.tcgid ? byTcgid.get(card.tcgid) : undefined;
    if (!id) continue;
    const cm = card.prices?.cardmarket ?? {};
    const fr = cm.lowest_near_mint_FR;
    const avg = cm["30d_average"];
    if (typeof fr === "number" && fr > 0 && typeof avg === "number" && avg > 0 && fr <= OUTLIER_FACTOR * avg) {
      result.set(id, fr);
    }
  }
  return result;
}

async function fetchFrPrices(ids: string[]): Promise<Map<string, number | null>> {
  const params = new URLSearchParams({ tcgids: ids.map(toTcgid).join(","), per_page: String(MAX_IDS) });
  const res = await fetch(`${BASE}/pokemon/cards?${params}`, {
    headers: {
      "x-rapidapi-key": process.env.TCGGO_RAPIDAPI_KEY ?? "",
      "x-rapidapi-host": HOST,
    },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`TCGGO_${res.status}`);
  return readFrPrices((await res.json()) as TcggoResponse, ids);
}

/**
 * Interroge TCGGO par lots de 20 et enregistre la cote française de chaque
 * carte. Une carte sans cote (absente, ou annonce aberrante) est enregistrée
 * aussi, à null, pour ne pas la redemander pendant 24 h. Une panne ou un quota
 * épuisé n'écrit rien : la fiche garde sa cote toutes langues et on retentera.
 */
export async function refreshFrPrices(cards: Pick<TcgdexCard, "id">[]): Promise<Map<string, FrPriceRow>> {
  const rows = new Map<string, FrPriceRow>();
  if (!tcggoConfigured() || cards.length === 0) return rows;
  const admin = createAdminClient();
  const ids = [...new Set(cards.map((c) => c.id))];

  for (let i = 0; i < ids.length; i += MAX_IDS) {
    const slice = ids.slice(i, i + MAX_IDS);
    let prices: Map<string, number | null>;
    try {
      prices = await fetchFrPrices(slice);
    } catch (err) {
      console.error(`[tcggo] ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const now = new Date();
    const batch: FrPriceRow[] = slice.map((id) => ({
      card_id: id,
      price: prices.get(id) ?? null,
      low: null,
      high: null,
      sample_count: 0,
      window_days: 0,
      source: "tcggo",
      sampled_at: now.toISOString(),
      expires_at: new Date(now.getTime() + TTL_HOURS * 3600_000).toISOString(),
    }));

    const { error } = await admin.from("card_prices_fr").upsert(batch, { onConflict: "card_id" });
    if (error) {
      // Migration 006 non passée : on sert la cote sans la mémoriser.
      console.error(`[tcggo] cache impossible : ${error.message}`);
    }

    const day = now.toISOString().slice(0, 10);
    const history = batch
      .filter((r) => r.price !== null)
      .map((r) => ({ card_id: r.card_id, snapshot_date: day, fr_price: r.price }));
    if (history.length) {
      await admin.from("price_history").upsert(history, { onConflict: "card_id,snapshot_date" });
    }

    for (const row of batch) rows.set(row.card_id, row);
  }
  return rows;
}

/** Cote française en cache si elle est fraîche, sinon relue chez TCGGO. */
export async function getFrPrice(card: Pick<TcgdexCard, "id">): Promise<FrPriceRow | null> {
  if (!tcggoConfigured()) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("card_prices_fr").select("*").eq("card_id", card.id).maybeSingle();
  const cached = data as FrPriceRow | null;
  if (cached && new Date(cached.expires_at) > new Date()) return cached;
  return (await refreshFrPrices([card])).get(card.id) ?? null;
}

/** Forme servie aux pages et à l'API. */
export type FrPrice = { price: number };

export function toFrPrice(row: FrPriceRow | null | undefined): FrPrice | null {
  return row && row.price !== null ? { price: Number(row.price) } : null;
}
