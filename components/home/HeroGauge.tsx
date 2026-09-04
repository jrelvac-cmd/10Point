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
const CY = 134;
const RADIUS = 98;
const STROKE = 30;
/** Écart angulaire entre deux segments, comme sur la maquette. */
const GAP_DEG = 7;

const COLORS = {
  down: "#F2A0A0",
  stable: "#F1F2F9",
  up: "#5561B9",
} as const;

/** Point du demi-cercle pour un angle donné (180° = gauche, 0° = droite). */
function polar(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + RADIUS * Math.cos(rad), y: CY - RADIUS * Math.sin(rad) };
}

function arc(fromDeg: number, toDeg: number) {
  const start = polar(fromDeg);
  const end = polar(toDeg);
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * Jauge demi-cercle. De gauche à droite : les cartes qui ont perdu plus de 5 %
 * sur 30 jours (rouge), celles restées dans ±5 % (blanc), celles qui ont pris
 * plus de 5 % (bleu). Chaque arc est proportionnel au NOMBRE de cartes.
 */
export function HeroGauge({ totalValue, gauge, variation, cardCount, distinctCount, plan }: Props) {
  const segments = [
    { key: "down", value: gauge.down, color: COLORS.down },
    { key: "stable", value: gauge.stable, color: COLORS.stable },
    { key: "up", value: gauge.up, color: COLORS.up },
  ].filter((s) => s.value > 0);

  // Collection vide : un seul arc blanc, pour garder la silhouette.
  const drawn = segments.length ? segments : [{ key: "empty", value: 1, color: COLORS.stable }];
  const sum = drawn.reduce((acc, s) => acc + s.value, 0);
  const usable = 180 - GAP_DEG * (drawn.length - 1);

  let cursor = 180;
  const paths = drawn.map((s, i) => {
    const sweep = (s.value / sum) * usable;
    const from = cursor;
    const to = cursor - sweep;
    cursor = to - GAP_DEG;
    return (
      <path
        key={s.key}
        d={arc(from, to)}
        stroke={s.color}
        strokeWidth={STROKE}
        fill="none"
        strokeLinecap="butt"
        filter={i === 0 || s.color === COLORS.stable ? "url(#gauge-shadow)" : undefined}
      />
    );
  });

  const limit = collectionLimitFor(plan);
  const positive = (variation?.eur ?? 0) >= 0;

  return (
    <section className="glass-card-strong flex flex-col gap-2 px-5 pb-4 pt-5">
      <h2 className="text-sm font-bold text-text-primary">Ma Collection</h2>

      <div className="relative -mt-1">
        <svg
          viewBox="0 0 240 150"
          className="mx-auto w-full max-w-[280px]"
          role="img"
          aria-label={`Sur 30 jours : ${gauge.down} cartes en baisse, ${gauge.stable} stables, ${gauge.up} en hausse`}
        >
          <defs>
            <filter id="gauge-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1c2160" floodOpacity="0.18" />
            </filter>
          </defs>
          {paths}
        </svg>
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <span className="text-[32px] font-extrabold leading-none tracking-tight text-text-primary">
            {formatEur(totalValue)}
          </span>
        </div>
      </div>

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
