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
  /** Types affichés en français (Feu, Eau…), vide pour un Dresseur ou une Énergie. */
  types: string[];
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
  types?: string[];
  image?: string;
  set?: { id?: string; name?: string; cardCount?: { official?: number; total?: number } };
  variants?: Partial<CardVariants>;
  pricing?: { cardmarket?: Record<string, unknown> };
  // La 1re édition n'est pas une colonne du prix principal : TCGdex la cote
  // comme un produit Cardmarket à part, glissé dans ce tableau de variantes.
  variants_detailed?: { stamp?: string[]; pricing?: { cardmarket?: Record<string, unknown> } }[];
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

/**
 * La 1re édition est un produit Cardmarket distinct de la version illimitée,
 * pas un champ du prix principal : TCGdex la range dans les variantes
 * détaillées, repérable à son tampon « 1re Édition ». Une carte peut avoir
 * plusieurs entrées identiques (holo/non-holo) : la première suffit.
 */
function firstEditionCardmarket(raw: RawCard): Record<string, unknown> | null {
  const variant = raw.variants_detailed?.find((v) => v.stamp?.includes("1re Édition"));
  return variant?.pricing?.cardmarket ?? null;
}

function toCard(raw: RawCard): TcgdexCard {
  const cm = raw.pricing?.cardmarket ?? {};
  const firstEditionCm = firstEditionCardmarket(raw);
  return {
    id: raw.id,
    localId: raw.localId,
    name: raw.name,
    rarity: raw.rarity ?? null,
    types: Array.isArray(raw.types) ? raw.types : [],
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
      first_edition_trend: num(firstEditionCm?.["trend"]),
      first_edition_low: num(firstEditionCm?.["low"]),
      first_edition_avg1: num(firstEditionCm?.["avg1"]),
      first_edition_avg7: num(firstEditionCm?.["avg7"]),
      first_edition_avg30: num(firstEditionCm?.["avg30"]),
    },
  };
}

export async function getCardById(id: string): Promise<TcgdexCard | null> {
  const raw = await request<RawCard>(`/cards/${encodeURIComponent(id)}`);
  return raw ? toCard(raw) : null;
}

/**
 * Le nom imprimé se compare mal au nom indexé par TCGdex : les « ex » modernes
 * s'y écrivent avec un tiret (« Dracaufeu-ex »), les Méga avec « M-… ». On
 * interroge donc sur le cœur du nom (le filtre TCGdex est un « contient »),
 * et on compare ensuite en ignorant tirets, espaces, accents et casse.
 */
const NAME_SUFFIX = /[\s-]+(ex|gx|v|vmax|vstar|v-union|break)\s*$/i;

function coreName(name: string): string {
  return name.replace(/^m[\s-]+/i, "").replace(NAME_SUFFIX, "").trim();
}

export function sameName(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s-]+/g, " ").trim();
  return norm(a) === norm(b);
}

/** Nombre de cartes chargées en détail : au-delà, le bon candidat est déjà en tête. */
const DETAIL_LIMIT = 12;

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

  const core = name_fr ? coreName(name_fr) : null;
  const total = set_total && /^\d+$/.test(set_total) ? Number(set_total) : null;
  const stripped = number ? number.replace(/^0+/, "") : null;

  const base = new URLSearchParams();
  if (core) base.set("name", core);

  const seen = new Map<string, RawSummary>();
  const weight = new Map<string, number>();
  const collect = (list: RawSummary[] | null, bonus: number) => {
    for (const item of list ?? []) {
      if (!seen.has(item.id)) seen.set(item.id, item);
      weight.set(item.id, (weight.get(item.id) ?? 0) + bonus);
    }
  };

  // Par numéro : « 25 » et « 025 » coexistent selon les sets, et le filtre
  // TCGdex est un « contient » (25 ramène aussi 025, 125, 225…).
  if (number) {
    for (const variant of new Set([stripped, number].filter(Boolean) as string[])) {
      const qs = new URLSearchParams(base);
      qs.set("localId", variant);
      collect(await request<RawSummary[]>(`/cards?${qs}`), 1);
    }
  }

  // Par total du set : c'est ce qui ramène les illustrations rares et les
  // secrètes, numérotées au-delà du total, quand le numéro a été mal lu.
  if (core && total !== null) {
    const qs = new URLSearchParams(base);
    qs.set("set.cardCount.official", String(total));
    collect(await request<RawSummary[]>(`/cards?${qs}`), 2);
  }

  // Recherche élargie au nom seul quand rien n'a rien donné.
  if (seen.size === 0 && core) collect(await request<RawSummary[]>(`/cards?${base}`), 0);
  if (seen.size === 0) return [];

  // Les résumés n'ont ni set ni prix : on charge le détail des plus probables,
  // numéro exact et set correspondant en tête.
  const score = (s: RawSummary) =>
    (weight.get(s.id) ?? 0) + (stripped && s.localId.replace(/^0+/, "") === stripped ? 3 : 0);
  const ordered = [...seen.values()].sort((a, b) => score(b) - score(a)).slice(0, DETAIL_LIMIT);
  const details = await Promise.all(ordered.map((s) => getCardById(s.id).catch(() => null)));

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
  if (name && sameName(card.name, name)) s += EXACT_NAME;
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

export type SetInfo = { releaseDate: string | null; abbreviation: string | null };

const setInfoCache = new Map<string, SetInfo>();

/**
 * Date de sortie et abréviation française d'un set (« ETD », « EB9 »…).
 * Un set ne change jamais : le résultat reste en mémoire pour la durée de vie
 * du processus. En cas d'échec, des champs vides plutôt qu'un scan raté.
 */
export async function getSetInfo(setId: string): Promise<SetInfo> {
  const cached = setInfoCache.get(setId);
  if (cached) return cached;

  const empty: SetInfo = { releaseDate: null, abbreviation: null };
  try {
    const raw = await request<{
      releaseDate?: string;
      abbreviation?: { localized?: string; official?: string };
    }>(`/sets/${encodeURIComponent(setId)}`);
    const info: SetInfo = {
      releaseDate: raw?.releaseDate ?? null,
      abbreviation: raw?.abbreviation?.localized ?? raw?.abbreviation?.official ?? null,
    };
    setInfoCache.set(setId, info);
    return info;
  } catch {
    return empty;
  }
}
