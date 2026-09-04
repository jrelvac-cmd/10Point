import { cn } from "@/lib/utils";

type Props = {
  name: string;
  set: string;
  price: string;
  variation: string;
  /** Teinte de base, en degrés. */
  hue: number;
  /** Inclinaison au repos, en degrés. */
  tilt?: number;
  /** Décalage de l'animation de flottement, en secondes. */
  delay?: number;
  className?: string;
};

/**
 * Carte stylisée, sans illustration sous licence : dégradés, reflet
 * holographique animé et flottement. Sert de visuel sur la page publique.
 */
export function HoloCard({ name, set, price, variation, hue, tilt = 0, delay = 0, className }: Props) {
  const up = variation.startsWith("+");
  return (
    <div
      aria-hidden
      className={cn("holo-card", className)}
      style={
        {
          "--hue": hue,
          "--tilt": `${tilt}deg`,
          animationDelay: `${delay}s`,
        } as React.CSSProperties
      }
    >
      <div className="holo-art" />
      <div className="holo-shine" />
      <div className="holo-body">
        <p className="text-[11px] font-extrabold leading-tight text-white drop-shadow">{name}</p>
        <p className="text-[9px] text-white/75">{set}</p>
        <div className="mt-auto flex items-end justify-between">
          <span className="text-sm font-extrabold text-white drop-shadow">{price}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
              up ? "bg-emerald-400/90 text-emerald-950" : "bg-rose-400/90 text-rose-950",
            )}
          >
            {variation}
          </span>
        </div>
      </div>
    </div>
  );
}
