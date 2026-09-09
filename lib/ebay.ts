import { createAdminClient } from "./supabase/admin";
import type { TcgdexCard } from "./tcgdex";

/**
 * Cote « carte française, état 9/10 » d'après eBay France.
 *
 * Le guide de prix Cardmarket (via TCGdex) donne un seul chiffre par carte,
 * toutes langues confondues et sans notion d'état. Ici, on lit les ventes
 * eBay France d'une carte, on ne garde que les exemplaires français, bruts
 * (non gradés), en bon état, et on prend la médiane. Sans clés eBay, tout ce
 * module est inerte et l'application retombe sur Cardmarket.
 *
 * Deux sources, dans l'ordre :
 *   - ventes réalisées (Marketplace Insights) : la vraie mesure, mais eBay
 *     n'ouvre cette API que sur demande (EBAY_SOLD_ACCESS=true une fois accordée) ;
 *   - annonces en cours (Browse) : prix demandés, plus hauts que les ventes ;
 *     on prend le quart inférieur plutôt que la médiane pour compenser.
 */

export type FrPriceSource = "ebay_sold" | "ebay_active";

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

export type Listing = {
  title: string;
  price: number;
  currency: string;
};

/** En dessous, la médiane ne veut rien dire : on n'affiche pas de cote française. */
export const FR_MIN_SAMPLES = 3;
export const FR_WINDOW_DAYS = 90;
const TTL_HOURS = 24;
const MARKETPLACE = "EBAY_FR";
/** Catégorie eBay « Cartes à collectionner : cartes à l'unité ». */
const SINGLES_CATEGORY = "183454";
const LIMIT = 200;
const API_TIMEOUT_MS = 6_000;

export function ebayConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

// ---------------------------------------------------------------------------
// Lecture des titres : ce qui fait qu'une annonce est bien « la » carte,
// française, brute et en bon état. Fonctions pures, testées à part.
// ---------------------------------------------------------------------------

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const GRADED = /\b(psa|bgs|cgc|pca|ace|sgc|beckett|grad[ée]e?s?|graded)\b/;
const NOT_SINGLE =
  /\b(lots?|playset|bundle|booster|display|coffret|scell[ée]e?|sealed|proxy|custom|r[ée]plique|replica|au choix|a choisir|choisissez|x\s?[2-9]\b)/;
const OTHER_LANGUAGE =
  /\b(anglais|anglaise|english|\ben\b|japonais|japonaise|japanese|jap|jp|allemand|allemande|german|deutsch|italien|italienne|italian|espagnol|espagnole|spanish|cor[ée]en|korean|chinois|chinese|portugais|portuguese|\bus\b)\b/;
const DAMAGED =
  /\b(ab[iî]m[ée]e?s?|played|\bpl\b|\bmp\b|\bhp\b|\blp\b|mauvais|us[ée]e?s?|pli[ée]e?s?|rayure|rayures|dmg|damaged|jou[ée]e?s?|d[ée]fauts?|trou|d[ée]chir)/;
/** Note sur 10 jugée insuffisante : de 1/10 à 8,5/10. */
const LOW_GRADE = /(?<![\d,.])([1-7]|8)(?:[,.]5)?\s*\/\s*10\b/;
const GOOD_CONDITION =
  /\b(nm|near\s?mint|mint|neuf|neuve|9(?:[,.]5)?\s*\/\s*10|10\s*\/\s*10|[ée]tat\s?9|excellent|parfait|impeccable)\b/;

/** Le titre parle bien de cette carte : nom présent et numéro dans le set. */
export function matchesCard(title: string, card: Pick<TcgdexCard, "name" | "localId" | "setPrintedTotal">) {
  const t = fold(title);
  if (!t.includes(fold(card.name))) return false;
  const num = card.localId.replace(/^0+/, "") || card.localId;
  if (card.setPrintedTotal) {
    const re = new RegExp(`(^|[^0-9])0*${num}\\s*/\\s*0*${card.setPrintedTotal}([^0-9]|$)`);
    return re.test(t);
  }
  return new RegExp(`(^|[^0-9])0*${num}([^0-9]|$)`).test(t);
}

export type TitleVerdict = "good" | "unknown" | "rejected";

/**
 * Tri d'une annonce d'après son titre. « good » : état explicitement proche
 * du neuf ; « unknown » : rien de dit, ce qui sur eBay France correspond le
 * plus souvent à une carte correcte ; « rejected » : gradée, lot, autre langue
 * ou état abîmé.
 */
export function judgeTitle(title: string): TitleVerdict {
  const t = fold(title);
  if (GRADED.test(t) || NOT_SINGLE.test(t) || OTHER_LANGUAGE.test(t)) return "rejected";
  if (DAMAGED.test(t) || LOW_GRADE.test(t)) return "rejected";
  return GOOD_CONDITION.test(t) ? "good" : "unknown";
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function quantile(sorted: number[], q: number) {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export type Aggregate = { price: number; low: number; high: number; count: number };

/**
 * Médiane robuste des prix retenus. Les annonces qui annoncent un bon état
 * suffisent quand elles sont assez nombreuses ; sinon on y ajoute celles qui
 * ne disent rien. Au-delà de dix prix, on écarte les 10 % extrêmes de chaque
 * côté (fautes de frappe, enchères parties de 1 €). Sur des annonces en cours,
 * on lit le quart inférieur : ce sont des prix demandés, pas des ventes.
 */
export function aggregate(
  listings: Listing[],
  card: Pick<TcgdexCard, "name" | "localId" | "setPrintedTotal">,
  mode: "sold" | "active",
): Aggregate | null {
  const eur = listings.filter((l) => l.currency === "EUR" && l.price > 0 && matchesCard(l.title, card));
  const good = eur.filter((l) => judgeTitle(l.title) === "good");
  const unknown = eur.filter((l) => judgeTitle(l.title) === "unknown");
  const kept = good.length >= FR_MIN_SAMPLES ? good : [...good, ...unknown];
  if (kept.length < FR_MIN_SAMPLES) return null;

  let prices = kept.map((l) => l.price).sort((a, b) => a - b);
  if (prices.length >= 10) {
    const cut = Math.floor(prices.length * 0.1);
    prices = prices.slice(cut, prices.length - cut);
  }
  const center = quantile(prices, mode === "sold" ? 0.5 : 0.25) as number;
  return {
    price: round2(center),
    low: round2(quantile(prices, 0.1) as number),
    high: round2(quantile(prices, 0.9) as number),
    count: kept.length,
  };
}

// ---------------------------------------------------------------------------
// Appels eBay.
// ---------------------------------------------------------------------------

const SCOPE_BROWSE = "https://api.ebay.com/oauth/api_scope";
const SCOPE_SOLD = "https://api.ebay.com/oauth/api_scope/buy.marketplace.insights";

const tokens = new Map<string, { value: string; expiresAt: number }>();

async function getToken(scope: string): Promise<string> {
  const cached = tokens.get(scope);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope }),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`EBAY_TOKEN_${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokens.set(scope, { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 });
  return json.access_token;
}

function searchQuery(card: Pick<TcgdexCard, "name" | "localId" | "setPrintedTotal">) {
  const num = card.localId.replace(/^0+/, "") || card.localId;
  return card.setPrintedTotal ? `${card.name} ${num}/${card.setPrintedTotal}` : `${card.name} ${num}`;
}

async function ebayGet(url: string, scope: string): Promise<unknown> {
  const token = await getToken(scope);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE,
      "Accept-Language": "fr-FR",
    },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`EBAY_${res.status}`);
  return res.json();
}

/** Ventes réalisées sur la fenêtre (Marketplace Insights, accès sur demande). */
export async function fetchSoldListings(card: TcgdexCard): Promise<Listing[]> {
  const since = new Date(Date.now() - FR_WINDOW_DAYS * 86_400_000).toISOString();
  const params = new URLSearchParams({
    q: searchQuery(card),
    category_ids: SINGLES_CATEGORY,
    filter: `lastSoldDate:[${since}..],itemLocationCountry:FR,priceCurrency:EUR`,
    limit: String(LIMIT),
  });
  const json = (await ebayGet(
    `https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search?${params}`,
    `${SCOPE_BROWSE} ${SCOPE_SOLD}`,
  )) as { itemSales?: { title?: string; lastSoldPrice?: { value?: string; currency?: string } }[] };
  return (json.itemSales ?? []).flatMap((s) =>
    s.title && s.lastSoldPrice?.value
      ? [{ title: s.title, price: Number(s.lastSoldPrice.value), currency: s.lastSoldPrice.currency ?? "EUR" }]
      : [],
  );
}

/** Annonces en cours (Browse) : repli quand les ventes ne sont pas accessibles. */
export async function fetchActiveListings(card: TcgdexCard): Promise<Listing[]> {
  const params = new URLSearchParams({
    q: searchQuery(card),
    category_ids: SINGLES_CATEGORY,
    filter: "itemLocationCountry:FR,priceCurrency:EUR,buyingOptions:{FIXED_PRICE}",
    limit: String(LIMIT),
  });
  const json = (await ebayGet(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    SCOPE_BROWSE,
  )) as { itemSummaries?: { title?: string; price?: { value?: string; currency?: string } }[] };
  return (json.itemSummaries ?? []).flatMap((s) =>
    s.title && s.price?.value
      ? [{ title: s.title, price: Number(s.price.value), currency: s.price.currency ?? "EUR" }]
      : [],
  );
}

// ---------------------------------------------------------------------------
// Cache en base.
// ---------------------------------------------------------------------------

/**
 * Interroge eBay et enregistre la cote française de la carte. Une absence de
 * ventes est enregistrée aussi (prix null), pour ne pas réinterroger eBay à
 * chaque scan d'une carte introuvable. Ne lève jamais : sans eBay, la fiche
 * garde sa cote Cardmarket.
 */
export async function refreshFrPrice(card: TcgdexCard): Promise<FrPriceRow | null> {
  if (!ebayConfigured()) return null;
  const admin = createAdminClient();

  let source: FrPriceSource = "ebay_active";
  let result: Aggregate | null = null;
  try {
    if (process.env.EBAY_SOLD_ACCESS === "true") {
      result = aggregate(await fetchSoldListings(card), card, "sold");
      source = "ebay_sold";
    }
    if (!result) {
      result = aggregate(await fetchActiveListings(card), card, "active");
      source = "ebay_active";
    }
  } catch (err) {
    console.error(`[ebay] ${card.id} : ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const now = new Date();
  const row: FrPriceRow = {
    card_id: card.id,
    price: result?.price ?? null,
    low: result?.low ?? null,
    high: result?.high ?? null,
    sample_count: result?.count ?? 0,
    window_days: FR_WINDOW_DAYS,
    source,
    sampled_at: now.toISOString(),
    expires_at: new Date(now.getTime() + TTL_HOURS * 3600_000).toISOString(),
  };
  const { error } = await admin.from("card_prices_fr").upsert(row, { onConflict: "card_id" });
  if (error) {
    // Table absente tant que la migration 004 n'est pas passée : on sert la cote sans la mémoriser.
    console.error(`[ebay] cache impossible : ${error.message}`);
    return row;
  }

  if (row.price !== null) {
    const day = now.toISOString().slice(0, 10);
    const { data: existing } = await admin
      .from("price_history")
      .select("id")
      .eq("card_id", card.id)
      .eq("snapshot_date", day)
      .maybeSingle();
    if (existing) {
      await admin.from("price_history").update({ fr_price: row.price }).eq("id", existing.id);
    } else {
      await admin.from("price_history").insert({ card_id: card.id, snapshot_date: day, fr_price: row.price });
    }
  }
  return row;
}

/** Cote française en cache si elle est fraîche, sinon relue chez eBay. */
export async function getFrPrice(card: TcgdexCard): Promise<FrPriceRow | null> {
  if (!ebayConfigured()) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("card_prices_fr").select("*").eq("card_id", card.id).maybeSingle();
  const cached = data as FrPriceRow | null;
  if (cached && new Date(cached.expires_at) > new Date()) return cached;
  return refreshFrPrice(card);
}

/** Forme servie aux pages et à l'API : ce qu'il faut pour afficher et expliquer la cote. */
export type FrPrice = {
  price: number;
  low: number | null;
  high: number | null;
  sampleCount: number;
  source: FrPriceSource;
  windowDays: number;
};

/** Une ligne de cache ne devient une cote que si elle repose sur assez de ventes. */
export function toFrPrice(row: FrPriceRow | null | undefined): FrPrice | null {
  if (!row || row.price === null || row.sample_count < FR_MIN_SAMPLES) return null;
  return {
    price: Number(row.price),
    low: row.low === null ? null : Number(row.low),
    high: row.high === null ? null : Number(row.high),
    sampleCount: row.sample_count,
    source: row.source,
    windowDays: row.window_days,
  };
}
