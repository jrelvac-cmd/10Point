const API_BASE = "https://api.tcgdex.net/v2/fr";
const ASSET_QUALITY = { small: "low", large: "high" } as const;

/** Variantes réellement existantes pour une carte donnée. */
export type CardVariants = {
  normal: boolean;
  holo: boolean;
  reverse: boolean;
  firstEdition: boolean;
};

export type TcgdexCard = {
  id: string;
  localId: string;
  name: string;
  rarity: string | null;
  setId: string | null;
  setName: string | null;
  setPrintedTotal: number | null;
  imageSmall: string | null;
  imageLarge: string | null;
  variants: CardVariants;
  cardmarket: Record<string, number | null>;
};

type RawCard = {
  id: string;
  localId: string;
  name: string;
  rarity?: string;
  image?: string;
  set?: { id?: string; name?: string; cardCount?: { official?: number; total?: number } };
  variants?: Partial<CardVariants>;
  pricing?: { cardmarket?: Record<string, unknown> };
};

type RawSummary = { id: string; localId: string; name: string; image?: string };

/**
 * TCGdex renvoie une URL d'image sans extension : la qualité et le format se
 * choisissent en suffixe.
 */
function imageUrl(base: string | undefined, size: keyof typeof ASSET_QUALITY) {
  return base ? `${base}/${ASSET_QUALITY[size]}.webp` : null;
}

/** Un réessai suffit ici : l'API s'est montrée stable (8/8 à ~60 ms). */
async function request<T>(path: string, attempts = 3): Promise<T | null> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      if (res.status === 404) return null;
      if (res.ok) return (await res.json()) as T;
      if (res.status < 500) throw new Error(`TCGDEX_${res.status}`);
      lastError = new Error(`TCGDEX_${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * 2 ** i));
  }

  throw lastError instanceof Error ? lastError : new Error("TCGDEX_UNAVAILABLE");
}

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

function toCard(raw: RawCard): TcgdexCard {
  const cm = raw.pricing?.cardmarket ?? {};
  return {
    id: raw.id,
    localId: raw.localId,
    name: raw.name,
    rarity: raw.rarity ?? null,
    setId: raw.set?.id ?? null,
    setName: raw.set?.name ?? null,
    setPrintedTotal: raw.set?.cardCount?.official ?? raw.set?.cardCount?.total ?? null,
    imageSmall: imageUrl(raw.image, "small"),
    imageLarge: imageUrl(raw.image, "large"),
    variants: {
      normal: raw.variants?.normal ?? false,
      holo: raw.variants?.holo ?? false,
      reverse: raw.variants?.reverse ?? false,
      firstEdition: raw.variants?.firstEdition ?? false,
    },
    // Le suffixe -holo correspond à la cote « reverse holo » de Cardmarket.
    cardmarket: {
      trend: num(cm["trend"]),
      low: num(cm["low"]),
      avg: num(cm["avg"]),
      avg1: num(cm["avg1"]),
      avg7: num(cm["avg7"]),
      avg30: num(cm["avg30"]),
      reverse_trend: num(cm["trend-holo"]),
      reverse_low: num(cm["low-holo"]),
      reverse_avg1: num(cm["avg1-holo"]),
      reverse_avg7: num(cm["avg7-holo"]),
      reverse_avg30: num(cm["avg30-holo"]),
    },
  };
}

export async function getCardById(id: string): Promise<TcgdexCard | null> {
  const raw = await request<RawCard>(`/cards/${encodeURIComponent(id)}`);
  return raw ? toCard(raw) : null;
}

/**
 * TCGdex indexe les cartes dans leur langue : le nom français lu sur la carte
 * sert donc directement de critère, sans traduction. Les résultats de recherche
 * ne portent pas les prix — il faut charger chaque carte retenue.
 */
export async function findCandidates(extraction: {
  name_fr: string | null;
  number: string | null;
  set_total: string | null;
}): Promise<TcgdexCard[]> {
  const { name_fr, number, set_total } = extraction;
  if (!name_fr && !number) return [];

  const params = new URLSearchParams();
  if (name_fr) params.set("name", name_fr);
  // « 25 » et « 025 » coexistent selon les sets : on interroge sans le zéro
  // initial puis, si besoin, avec la forme exacte.
  const variants = number
    ? Array.from(new Set([number.replace(/^0+/, ""), number])).filter(Boolean)
    : [null];

  const seen = new Map<string, RawSummary>();
  for (const variant of variants) {
    const qs = new URLSearchParams(params);
    if (variant) qs.set("localId", variant);
    const list = (await request<RawSummary[]>(`/cards?${qs}`)) ?? [];
    for (const item of list) if (!seen.has(item.id)) seen.set(item.id, item);
    if (seen.size >= 20) break;
  }

  // Recherche élargie au nom seul quand le numéro n'a rien donné.
  if (seen.size === 0 && name_fr) {
    const list = (await request<RawSummary[]>(`/cards?name=${encodeURIComponent(name_fr)}`)) ?? [];
    for (const item of list.slice(0, 20)) seen.set(item.id, item);
  }

  if (seen.size === 0) return [];

  // Les résumés n'ont ni set ni prix : on charge le détail des plus probables.
  const details = await Promise.all(
    [...seen.values()].slice(0, 12).map((s) => getCardById(s.id).catch(() => null)),
  );

  return rank(details.filter((c): c is TcgdexCard => c !== null), name_fr, set_total, number);
}

const EXACT_NAME = 100;
const EXACT_TOTAL = 40;
const EXACT_NUMBER = 20;
const CERTAIN_SCORE = EXACT_NAME + EXACT_TOTAL + EXACT_NUMBER;

function scoreCard(
  card: TcgdexCard,
  name: string | null,
  total: number | null,
  number: string | null,
) {
  let s = 0;
  if (name && card.name.toLowerCase().trim() === name.toLowerCase().trim()) s += EXACT_NAME;
  if (total !== null && card.setPrintedTotal === total) s += EXACT_TOTAL;
  if (number && card.localId.replace(/^0+/, "") === number.replace(/^0+/, "")) {
    s += EXACT_NUMBER;
  }
  return s;
}

/** Classe les candidats sans en écarter : le bon ne doit jamais disparaître. */
function rank(
  cards: TcgdexCard[],
  name: string | null,
  setTotal: string | null,
  number: string | null,
): TcgdexCard[] {
  const total = setTotal ? Number(setTotal) : null;
  return [...cards].sort(
    (a, b) => scoreCard(b, name, total, number) - scoreCard(a, name, total, number),
  );
}

/**
 * Vrai quand le premier candidat est le seul à réunir nom, numéro et total du
 * set. Trois signaux concordants suffisent pour confirmer sans faire choisir.
 */
export function isUnambiguous(
  ranked: TcgdexCard[],
  extraction: { name_fr: string | null; number: string | null; set_total: string | null },
): boolean {
  if (ranked.length === 0) return false;
  if (ranked.length === 1) return true;

  const { name_fr, number, set_total } = extraction;
  if (!name_fr || !number || !set_total) return false;

  const total = Number(set_total);
  if (!Number.isFinite(total)) return false;

  const best = scoreCard(ranked[0], name_fr, total, number);
  if (best < CERTAIN_SCORE) return false;
  return scoreCard(ranked[1], name_fr, total, number) < best;
}

/** Lien de recherche eBay France, à défaut d'un accès à leur API. */
export function ebaySearchUrl(card: TcgdexCard) {
  const total = card.setPrintedTotal ? `/${card.setPrintedTotal}` : "";
  const q = `${card.name} ${card.localId}${total} carte pokemon`;
  return `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(q)}`;
}
