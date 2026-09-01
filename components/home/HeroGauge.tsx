import { formatEur } from "@/lib/pricing";

type Props = {
  up: number;
  down: number;
  stable: number;
  total: number;
  variationEur: number | null;
  variationPct: number | null;
};

const RADIUS = 100;
const STROKE = 18;
const CX = 120;
const CY = 120;

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
 * Jauge demi-cercle : la longueur de chaque arc est proportionnelle à la
 * VALEUR des cartes concernées, pas à leur nombre. Une carte à 300 € pèse donc
 * plus qu'une carte à 1 €, ce qui reflète la santé réelle de la collection.
 */
export function HeroGauge({ up, down, stable, total, variationEur, variationPct }: Props) {
  const segments =
    total > 0
      ? [
          { value: up, color: "#4338CA" },
          { value: stable, color: "rgba(255,255,255,0.15)" },
          { value: down, color: "#A5B4FC" },
        ]
      : [{ value: 1, color: "rgba(255,255,255,0.15)" }];

  const totalForRatio = total > 0 ? total : 1;

  let cursor = 180;
  const paths = segments
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const sweep = (s.value / totalForRatio) * 180;
      const from = cursor;
      const to = cursor - sweep;
      cursor = to;
      return <path key={i} d={arc(from, to)} stroke={s.color} strokeWidth={STROKE} fill="none" strokeLinecap="butt" />;
    });

  const positive = (variationEur ?? 0) >= 0;

  return (
    <section className="glass-card-strong flex flex-col items-center gap-3 px-6 py-6">
      <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
        Valeur collection
      </span>

      <div className="relative">
        <svg viewBox="0 0 240 140" className="w-full max-w-[260px]" role="img" aria-label="Répartition hausse et baisse sur 30 jours">
          {paths}
        </svg>
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
          <span className="font-mono text-3xl text-text-primary">{formatEur(total)}</span>
          {variationPct !== null && (
            <span className={`font-mono text-xs ${positive ? "text-up" : "text-down"}`}>
              {positive ? "+" : ""}
              {formatEur(variationEur)} ({positive ? "+" : ""}
              {variationPct} %) sur 30 j
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full gap-2">
        <Legend label="En hausse" value={up} color="#4338CA" />
        <Legend label="En baisse" value={down} color="#A5B4FC" />
      </div>
    </section>
  );
}

function Legend({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="text-[11px] text-text-secondary">{label}</span>
      <span className="ml-auto font-mono text-xs text-text-primary">{formatEur(value)}</span>
    </div>
  );
}
