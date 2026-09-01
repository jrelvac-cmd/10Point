import type { PokeTcgCard } from "./poketcg";

export type CardPriceRow = {
  card_id: string;
  trend: number | null;
  low: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  reverse_trend: number | null;
  reverse_low: number | null;
  reverse_avg1: number | null;
  reverse_avg7: number | null;
  reverse_avg30: number | null;
};

/**
 * Cardmarket renvoie 0 pour une variante qu'il ne cote pas (le Set de Base n'a
 * pas de reverse, par exemple). Une carte ne valant jamais exactement 0 €, on
 * traite cette valeur comme une absence de donnée : « — » plutôt que « 0,00 € »,
 * qui laisserait croire que la carte est sans valeur.
 */
const round2 = (v: number | undefined) =>
  typeof v === "number" && Number.isFinite(v) && v > 0
    ? Math.round(v * 100) / 100
    : null;

export function extractPrices(card: PokeTcgCard): CardPriceRow {
  const p = card.cardmarket?.prices ?? {};
  return {
    card_id: card.id,
    trend: round2(p.trendPrice),
    low: round2(p.lowPrice),
    avg1: round2(p.avg1),
    avg7: round2(p.avg7),
    avg30: round2(p.avg30),
    reverse_trend: round2(p.reverseHoloTrend),
    reverse_low: round2(p.reverseHoloLow),
    reverse_avg1: round2(p.reverseHoloAvg1),
    reverse_avg7: round2(p.reverseHoloAvg7),
    reverse_avg30: round2(p.reverseHoloAvg30),
  };
}

/** Prix applicable selon la variante choisie par l'utilisateur. */
export function resolvePrice(price: CardPriceRow | null, isReverse: boolean) {
  if (!price) return { trend: null, low: null, avg30: null };
  return isReverse
    ? { trend: price.reverse_trend, low: price.reverse_low, avg30: price.reverse_avg30 }
    : { trend: price.trend, low: price.low, avg30: price.avg30 };
}

/**
 * Variation 30 jours en % : écart entre la tendance actuelle et la moyenne des
 * 30 derniers jours. Retourne null si l'une des deux valeurs manque, pour ne
 * jamais afficher une variation inventée.
 */
export function variation30d(trend: number | null, avg30: number | null): number | null {
  if (trend === null || avg30 === null || avg30 === 0) return null;
  return Math.round(((trend - avg30) / avg30) * 1000) / 10;
}

/** Une carte est considérée stable en deçà de ce seuil (bruit de marché). */
const STABLE_THRESHOLD_PCT = 1;

export type GaugeInput = {
  value: number;
  variationPct: number | null;
};

export function computeGauge(items: GaugeInput[]) {
  let up = 0;
  let down = 0;
  let stable = 0;

  for (const { value, variationPct } of items) {
    if (variationPct === null || Math.abs(variationPct) < STABLE_THRESHOLD_PCT) {
      stable += value;
    } else if (variationPct > 0) {
      up += value;
    } else {
      down += value;
    }
  }

  const total = up + down + stable;
  return { up, down, stable, total };
}

export function formatEur(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function ebaySearchUrl(cardName: string, number: string, setTotal: number) {
  const q = `${cardName} ${number}/${setTotal} carte pokemon`;
  return `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(q)}`;
}
