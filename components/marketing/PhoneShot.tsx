import Image from "next/image";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  /** Largeur du téléphone, en pixels : toutes les proportions en découlent. */
  width: number;
  /** Hauteur d'écran visible ; ignorée si `full`. */
  height?: number;
  /** Téléphone entier, avec la barre d'accueil en bas. */
  full?: boolean;
  /** Partie de la capture montrée quand elle est recadrée. */
  align?: "top" | "bottom";
  sizes?: string;
  priority?: boolean;
  /** Charge sans attendre d'être visible : pour un carrousel dont les panneaux arrivent d'eux-mêmes. */
  eager?: boolean;
  className?: string;
};

/** Rapport d'une capture : 390 × 844 points. */
const SCREEN_RATIO = 844 / 390;

/**
 * Capture réelle de l'application dans un iPhone : cadre noir, Dynamic Island,
 * barre d'état à 9:41, barre d'accueil quand le bas est visible. Les cotes
 * sont en `em`, calées sur la largeur, pour garder le même dessin à toute taille.
 */
export function PhoneShot({ src, alt, width, height, full, align = "top", sizes, priority, eager, className }: Props) {
  const em = width / 20;
  const bezel = 0.7 * em;
  const statusBar = 3.2 * em;
  const inner = width - 2 * bezel;
  const screenHeight = full ? inner * SCREEN_RATIO + statusBar : (height ?? 360);

  return (
    <div
      aria-hidden={alt === ""}
      className={cn("relative bg-[#0c0d12] shadow-[0_30px_60px_rgba(20,25,90,0.25)]", className)}
      style={{ width, fontSize: em, borderRadius: "3.6em", padding: bezel }}
    >
      <div className="relative overflow-hidden bg-[#eceef8]" style={{ borderRadius: "2.9em", height: screenHeight }}>
        <div
          className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-[1.6em] text-[#1b1f3b]"
          style={{ height: statusBar }}
        >
          <span className="text-[1.1em] font-semibold tracking-[-0.02em]">9:41</span>
          <span className="flex items-center gap-[0.35em]">
            <Signal size="1em" strokeWidth={2.6} />
            <Wifi size="1em" strokeWidth={2.6} />
            <BatteryFull size="1.25em" strokeWidth={2.2} />
          </span>
        </div>
        <div
          className="absolute left-1/2 z-20 -translate-x-1/2 rounded-full bg-black"
          style={{ top: "0.75em", width: "6.2em", height: "1.9em" }}
        />
        <div className="absolute inset-x-0 bottom-0" style={{ top: statusBar }}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes ?? `${width}px`}
            priority={priority}
            loading={eager && !priority ? "eager" : undefined}
            className={cn("object-cover", align === "top" ? "object-top" : "object-bottom")}
          />
        </div>
        {full && (
          <div className="absolute bottom-[0.55em] left-1/2 z-10 h-[0.32em] w-[8.5em] -translate-x-1/2 rounded-full bg-black/85" />
        )}
      </div>
    </div>
  );
}
