import { Coins, Library } from "lucide-react";
import { PhoneShot } from "./PhoneShot";

const STEP_SHOTS: {
  src: string;
  alt: string;
  full?: boolean;
  height?: number;
  align?: "top" | "bottom";
}[] = [
  {
    src: "/screenshots/scan.webp",
    alt: "Le viseur reconnaît une carte Dracaufeu : coins verts et mention « Carte détectée »",
    full: true,
  },
  {
    src: "/screenshots/result.webp",
    alt: "Fiche de la carte reconnue : Dracaufeu du Set de Base, cote de référence en euros",
    height: 300,
    align: "top",
  },
  {
    src: "/screenshots/home.webp",
    alt: "Tableau de bord : valeur totale de la collection, variation sur 30 jours, nombre de cartes",
    height: 300,
    align: "top",
  },
];

/** Mockup iPhone sur la capture réelle de l'application, un par étape. */
export function StepVisual({ index }: { index: number }) {
  const s = STEP_SHOTS[index];
  return (
    <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl bg-[#e9ebf7]">
      <PhoneShot
        src={s.src}
        alt={s.alt}
        width={172}
        height={s.height}
        full={s.full}
        align={s.align}
        sizes="172px"
      />
    </div>
  );
}

/** Capture réelle illustrant chaque axe marketing. */
export function AxisVisual({ kind }: { kind: "price" | "moves" | "share" }) {
  if (kind === "price") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <PhoneShot
          src="/screenshots/result.webp"
          alt="Fiche d'une carte reconnue : Dracaufeu du Set de Base, cote de référence Cardmarket en euros, tendance et prix de départ"
          height={360}
          width={260}
        />
        <p className="text-center text-[11px] text-text-muted">Capture réelle de l&apos;application.</p>
      </div>
    );
  }
  if (kind === "moves") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <PhoneShot
          src="/screenshots/collection.webp"
          alt="Collection triée par variation : chaque carte avec sa cote et son évolution sur 30 jours"
          height={400}
          width={260}
        />
        <p className="text-center text-[11px] text-text-muted">Capture réelle de l&apos;application.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3">
      <PhoneShot
        src="/screenshots/public.webp"
        alt="Page publique d'une collection : valeur totale, nombre de cartes et liste des cartes"
        height={360}
        width={260}
      />
      <p className="text-[11px] text-text-muted">
        <Library size={12} className="mr-1 inline" />
        Page publique en lecture seule : ni email, ni informations personnelles.
      </p>
      <p className="text-[11px] text-text-muted">
        <Coins size={12} className="mr-1 inline" />
        Les visiteurs voient les cotes, pas ton compte.
      </p>
    </div>
  );
}
