import type { TcgdexCard } from "./tcgdex";

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

const round2 = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) && v > 0
    ? Math.round(v * 100) / 100
    : null;

/**
 * Les prix viennent de Cardmarket en euros. Une valeur nulle ou absente
 * signifie « pas de cote », jamais « ne vaut rien » : on la garde à null pour
 * afficher « — » plutôt qu'un trompeur 0,00 €.
 */
export function extractPrices(card: TcgdexCard): CardPriceRow {
  const cm = card.cardmarket;
  return {
    card_id: card.id,
    trend: round2(cm.trend),
    low: round2(cm.low),
    avg1: round2(cm.avg1),
    avg7: round2(cm.avg7),
    avg30: round2(cm.avg30),
    reverse_trend: round2(cm.reverse_trend),
    reverse_low: round2(cm.reverse_low),
    reverse_avg1: round2(cm.reverse_avg1),
    reverse_avg7: round2(cm.reverse_avg7),
    reverse_avg30: round2(cm.reverse_avg30),
  };
}

/**
 * Prix applicable selon la variante possédée. Cardmarket cote séparément la
 * version reverse ; le holo d'une carte ancienne EST la carte, il n'a donc pas
 * de cote distincte et retombe sur le prix principal.
 */
export function resolvePrice(price: CardPriceRow | null, isReverse: boolean) {
  if (!price) return { trend: null, low: null, avg30: null };

  if (isReverse && price.reverse_trend !== null) {
    return { trend: price.reverse_trend, low: price.reverse_low, avg30: price.reverse_avg30 };
  }
  return { trend: price.trend, low: price.low, avg30: price.avg30 };
}

/**
 * Variation 30 jours en % : écart entre la tendance actuelle et la moyenne des
 * 30 derniers jours. null si l'une des deux manque, pour ne jamais afficher une
 * variation inventée.
 */
export function variation30d(trend: number | null, avg30: number | null): number | null {
  if (trend === null || avg30 === null || avg30 === 0) return null;
  return Math.round(((trend - avg30) / avg30) * 1000) / 10;
}

/** En deçà de ce seuil, on considère la carte stable (bruit de marché). */
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

  return { up, down, stable, total: up + down + stable };
}

export function formatEur(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
