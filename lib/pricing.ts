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
  first_edition_trend: number | null;
  first_edition_low: number | null;
  first_edition_avg1: number | null;
  first_edition_avg7: number | null;
  first_edition_avg30: number | null;
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
    first_edition_trend: round2(cm.first_edition_trend),
    first_edition_low: round2(cm.first_edition_low),
    first_edition_avg1: round2(cm.first_edition_avg1),
    first_edition_avg7: round2(cm.first_edition_avg7),
    first_edition_avg30: round2(cm.first_edition_avg30),
  };
}

export type ResolvedPrice = {
  trend: number | null;
  low: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
};

/**
 * Prix applicable selon la variante possédée. Cardmarket cote séparément la
 * version reverse et la 1re édition, chacune comme un produit à part ; le
 * holo d'une carte ancienne EST la carte, il n'a donc pas de cote distincte
 * et retombe sur le prix principal. Une 1re édition l'emporte sur le reverse
 * quand les deux sont cochés : c'est le tampon le plus rare, et Cardmarket
 * ne cote pas la combinaison séparément.
 */
export function resolvePrice(
  price: CardPriceRow | null,
  isReverse: boolean,
  isFirstEdition = false,
): ResolvedPrice {
  if (!price) return { trend: null, low: null, avg1: null, avg7: null, avg30: null };

  if (isFirstEdition && price.first_edition_trend !== null) {
    return {
      trend: price.first_edition_trend,
      low: price.first_edition_low,
      avg1: price.first_edition_avg1,
      avg7: price.first_edition_avg7,
      avg30: price.first_edition_avg30,
    };
  }
  if (isReverse && price.reverse_trend !== null) {
    return {
      trend: price.reverse_trend,
      low: price.reverse_low,
      avg1: price.reverse_avg1,
      avg7: price.reverse_avg7,
      avg30: price.reverse_avg30,
    };
  }
  return { trend: price.trend, low: price.low, avg1: price.avg1, avg7: price.avg7, avg30: price.avg30 };
}

/**
 * Cote de référence : la moyenne 30 jours plutôt que la tendance brute.
 *
 * La « tendance » Cardmarket peut être tirée par une seule vente sur une
 * carte peu liquide — une Raichu vue à 32 € un jour, 156 € quatre jours plus
 * tard, sans qu'aucun collectionneur n'ait rien changé au marché. La moyenne
 * 30 jours lisse ce bruit ; c'est elle qui valorise la collection et sert de
 * chiffre qui engage. Repli sur la tendance seulement si l'historique est
 * trop jeune pour avoir une moyenne 30 jours.
 */
export function referenceValue(price: ResolvedPrice): number | null {
  return price.avg30 ?? price.trend;
}

/**
 * Signale un marché mince pour cette carte plutôt qu'une erreur : la moyenne
 * de la dernière journée s'éloigne fortement de la moyenne 30 jours, signe
 * qu'une vente isolée pèse lourd sur la statistique. Sert à afficher un
 * avertissement de lecture, jamais à cacher le prix.
 */
export function isVolatile(price: ResolvedPrice): boolean {
  const ref = referenceValue(price);
  if (ref === null || ref <= 0 || price.avg1 === null) return false;
  return price.avg1 > ref * 3 || price.avg1 < ref / 3;
}

export type PriceVariation = {
  /** Écart en % entre la cote d'aujourd'hui et la plus ancienne mesure de la fenêtre. */
  pct: number;
  /** Jours réellement couverts : 30 quand l'historique est complet, moins sinon. */
  days: number;
};

export type PriceSnapshot = { date: string; value: number | null };

export const VARIATION_WINDOW_DAYS = 30;

/**
 * Variation entre la cote d'aujourd'hui et la plus ancienne mesure disponible
 * dans la fenêtre. Comparer la tendance à la moyenne 30 jours, comme avant,
 * mettait face à face deux statistiques de la même période et produisait des
 * écarts fantaisistes ; seule notre propre série quotidienne donne un vrai
 * avant/après. null tant qu'il n'y a pas au moins un jour d'écart mesuré.
 */
export function variationFromHistory(
  current: number | null,
  snapshots: PriceSnapshot[],
  today = new Date(),
): PriceVariation | null {
  if (current === null || current <= 0) return null;
  const todayKey = today.toISOString().slice(0, 10);
  const floor = new Date(today.getTime() - VARIATION_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const oldest = snapshots
    .filter((s) => s.value !== null && s.value > 0 && s.date >= floor && s.date < todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!oldest) return null;
  const days = Math.round((Date.parse(todayKey) - Date.parse(oldest.date)) / 86_400_000);
  if (days < 1) return null;
  const from = oldest.value as number;
  return { pct: Math.round(((current - from) / from) * 1000) / 10, days };
}

/**
 * En deçà de ±5 % sur 30 jours, une carte est considérée stable : c'est le
 * bruit normal du marché, pas une tendance. Au-delà, elle a monté ou baissé.
 */
export const STABLE_THRESHOLD_PCT = 5;

export type GaugeInput = {
  /** Nombre d'exemplaires possédés : trois Pikachu pèsent trois cartes. */
  count: number;
  variationPct: number | null;
};

export type GaugeBreakdown = {
  up: number;
  stable: number;
  down: number;
  total: number;
};

/**
 * Répartition de la collection en NOMBRE de cartes, pas en valeur : la jauge
 * répond à « combien de mes cartes montent, stagnent, baissent ». Une carte
 * sans variation connue est rangée parmi les stables : on ne sait rien
 * affirmer sur elle, et l'exclure ferait disparaître une partie de la
 * collection du visuel.
 */
export function computeGauge(items: GaugeInput[]): GaugeBreakdown {
  let up = 0;
  let down = 0;
  let stable = 0;

  for (const { count, variationPct } of items) {
    if (variationPct === null || Math.abs(variationPct) <= STABLE_THRESHOLD_PCT) {
      stable += count;
    } else if (variationPct > 0) {
      up += count;
    } else {
      down += count;
    }
  }

  return { up, down, stable, total: up + down + stable };
}

export type CollectionVariation = {
  eur: number;
  pct: number;
  /** Fenêtre la plus courte parmi les cartes mesurées : on ne prétend pas plus. */
  days: number;
};

/**
 * Variation de la collection entière sur la fenêtre mesurée : différence entre
 * la valeur actuelle et ce que valaient les mêmes cartes au début de la fenêtre. Seules
 * les lignes dont on connaît les deux prix entrent dans le calcul, pour ne pas
 * afficher un écart trompeur. null tant qu'aucune ligne n'est mesurable.
 */
export function computeCollectionVariation(
  items: { lineValue: number | null; variation: PriceVariation | null }[],
): CollectionVariation | null {
  let now = 0;
  let then = 0;
  let days = Infinity;
  for (const { lineValue, variation } of items) {
    if (lineValue === null || variation === null) continue;
    now += lineValue;
    then += lineValue / (1 + variation.pct / 100);
    days = Math.min(days, variation.days);
  }
  if (then <= 0) return null;
  return {
    eur: Math.round((now - then) * 100) / 100,
    pct: Math.round(((now - then) / then) * 1000) / 10,
    days,
  };
}

export function formatEur(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/** Pourcentage signé, une décimale, format français : « +8,2 % ». */
export function formatPct(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

/**
 * Cote affichée : la cote française (eBay, carte FR brute en bon état) quand
 * elle existe pour la carte telle qu'elle est possédée, sinon Cardmarket.
 * eBay n'est lu que pour l'exemplaire courant : une reverse ou une 1re
 * édition garde la cote Cardmarket de sa variante.
 */
export type ReferenceSource = "fr" | "cardmarket";

export function pickReference(
  price: ResolvedPrice,
  frPrice: number | null | undefined,
  variant: { reverse: boolean; firstEdition: boolean } = { reverse: false, firstEdition: false },
): { value: number | null; source: ReferenceSource } {
  if (frPrice != null && frPrice > 0 && !variant.reverse && !variant.firstEdition) {
    return { value: frPrice, source: "fr" };
  }
  return { value: referenceValue(price), source: "cardmarket" };
}
