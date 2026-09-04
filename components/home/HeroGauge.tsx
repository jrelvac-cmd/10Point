import { formatEur, formatPct, type CollectionVariation, type GaugeBreakdown } from "@/lib/pricing";
import { collectionLimitFor, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";

type Props = {
  totalValue: number;
  gauge: GaugeBreakdown;
  variation: CollectionVariation | null;
  cardCount: number;
  distinctCount: number;
  plan: Plan;
};

const CX = 120;
const CY = 128;
const OUTER = 110;
const INNER = 67;
const CORNER = 12;
/** Écart angulaire entre deux segments, comme sur la maquette. */
const GAP_DEG = 7;

const COLORS = {
  down: "#E2908A",
  stable: "#FBFAF7",
  up: "#5A66AC",
} as const;

const RAD = Math.PI / 180;

function polar(radius: number, deg: number) {
  const x = CX + radius * Math.cos(deg * RAD);
  const y = CY - radius * Math.sin(deg * RAD);
  return `${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`;
}

/**
 * Plus grand arrondi qui tienne dans un secteur de `spanDeg` : au-delà, les
 * deux coins du bord intérieur se recouvrent et la forme se replie sur
 * elle-même.
 */
function fittingCorner(spanDeg: number) {
  const sin = Math.sin((spanDeg / 2) * RAD);
  return Math.min(CORNER, ((INNER * sin) / (1 - sin)) * 0.9, (OUTER - INNER) / 2);
}

/**
 * Secteur d'anneau aux quatre coins arrondis, de `fromDeg` à `toDeg`
 * (180° à gauche, 0° à droite, donc `fromDeg` > `toDeg`).
 *
 * Les points de tangence sont calculés exactement plutôt qu'approchés par la
 * longueur d'arc : sinon le raccord entre l'arc et son coin se voit comme une
 * cassure sur un trait aussi épais.
 */
function sectorPath(fromDeg: number, toDeg: number) {
  const rc = fittingCorner(fromDeg - toDeg);
  const outerShift = Math.asin(rc / (OUTER - rc)) / RAD;
  const innerShift = Math.asin(rc / (INNER + rc)) / RAD;
  const outerEdge = (OUTER - rc) * Math.cos(outerShift * RAD);
  const innerEdge = (INNER + rc) * Math.cos(innerShift * RAD);

  const start = polar(OUTER, fromDeg - outerShift);

  return [
    `M${start}`,
    `A${OUTER} ${OUTER} 0 0 1 ${polar(OUTER, toDeg + outerShift)}`,
    `A${rc} ${rc} 0 0 1 ${polar(outerEdge, toDeg)}`,
    `L${polar(innerEdge, toDeg)}`,
    `A${rc} ${rc} 0 0 1 ${polar(INNER, toDeg + innerShift)}`,
    `A${INNER} ${INNER} 0 0 0 ${polar(INNER, fromDeg - innerShift)}`,
    `A${rc} ${rc} 0 0 1 ${polar(innerEdge, fromDeg)}`,
    `L${polar(outerEdge, fromDeg)}`,
    `A${rc} ${rc} 0 0 1 ${start}`,
    "Z",
  ].join(" ");
}

/**
 * Jauge demi-cercle. De gauche à droite : les cartes qui ont perdu plus de 5 %
 * sur 30 jours (rouge), celles restées dans ±5 % (blanc), celles qui ont pris
 * plus de 5 % (bleu). Chaque secteur est proportionnel au NOMBRE de cartes.
 */
export function HeroGauge({ totalValue, gauge, variation, cardCount, distinctCount, plan }: Props) {
  const segments = [
    { key: "down", value: gauge.down, color: COLORS.down },
    { key: "stable", value: gauge.stable, color: COLORS.stable },
    { key: "up", value: gauge.up, color: COLORS.up },
  ].filter((s) => s.value > 0);

  // Collection vide : un seul secteur blanc, pour garder la silhouette.
  const drawn = segments.length ? segments : [{ key: "empty", value: 1, color: COLORS.stable }];
  const sum = drawn.reduce((acc, s) => acc + s.value, 0);
  const usable = 180 - GAP_DEG * (drawn.length - 1);

  let cursor = 180;
  const paths = drawn.map((s) => {
    const from = cursor;
    const to = cursor - (s.value / sum) * usable;
    cursor = to - GAP_DEG;
    return (
      <path key={s.key} d={sectorPath(from, to)} fill={s.color} filter="url(#gauge-shadow)" />
    );
  });

  const limit = collectionLimitFor(plan);
  const positive = (variation?.eur ?? 0) >= 0;
  const value = formatEur(totalValue);
  // Taille en unités du viewBox, resserrée sur les montants longs : le creux de
  // la jauge offre environ 108 unités utiles et un chiffre en fait 0,53.
  const valueSize = Math.min(22, 108 / (value.length * 0.53));

  return (
    <section className="glass-card-strong flex flex-col gap-2 px-5 pb-4 pt-5">
      <h2 className="text-sm font-bold text-text-primary">Ma Collection</h2>

      <svg
        viewBox="0 0 240 140"
        className="mx-auto w-full max-w-[300px]"
        role="img"
        aria-label={`${value}. Sur 30 jours : ${gauge.down} cartes en baisse, ${gauge.stable} stables, ${gauge.up} en hausse`}
      >
        <defs>
          <filter id="gauge-shadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#1c2160" floodOpacity="0.14" />
          </filter>
        </defs>
        {paths}
        {/* Dans le SVG, et non par-dessus : la valeur suit ainsi l'échelle de la
            jauge et reste dans son creux quelle que soit la largeur d'écran. */}
        <text
          x={CX}
          y={CY - 23}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={valueSize}
          className="fill-text-primary font-extrabold [letter-spacing:-0.02em]"
        >
          {value}
        </text>
      </svg>

      <div className="glass-inner mt-1 grid grid-cols-2 divide-x divide-black/10 px-2 py-3">
        <Stat
          dotClass={variation === null ? "bg-text-muted" : positive ? "bg-gauge-up" : "bg-gauge-down"}
          label="Variation 30 j"
          value={variation ? formatPct(variation.pct) : "—"}
          sub={variation ? `${positive ? "+" : ""}${formatEur(variation.eur)}` : "pas encore mesurée"}
          valueClass={variation === null ? undefined : positive ? "text-up" : "text-down"}
        />
        <Stat
          dotClass="bg-text-muted"
          label="Cartes"
          value={cardCount.toLocaleString("fr-FR")}
          sub={
            limit === null
              ? `${distinctCount} référence${distinctCount > 1 ? "s" : ""}`
              : `${distinctCount} / ${limit} références`
          }
        />
      </div>
    </section>
  );
}

function Stat({
  dotClass,
  label,
  value,
  sub,
  valueClass,
}: {
  dotClass: string;
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3">
      <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
        {label}
      </span>
      <span className={cn("text-base font-bold leading-tight text-text-primary", valueClass)}>
        {value}
      </span>
      <span className="text-[11px] text-text-muted">{sub}</span>
    </div>
  );
}
