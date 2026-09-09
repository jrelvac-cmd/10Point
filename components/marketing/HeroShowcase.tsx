import Image from "next/image";
import { cn } from "@/lib/utils";
import { PhoneCarousel, type ImageItem } from "@/components/ui/phone-carousel";

/** Cartes réelles qui s'échappent du téléphone, mêmes images que dans l'application. */
const CARDS = [
  {
    src: "https://assets.tcgdex.net/fr/base/base1/4/high.webp",
    tilt: -8,
    delay: 0,
    className: "-right-14 top-[150px] w-[84px]",
  },
  {
    src: "https://assets.tcgdex.net/fr/ecard/ecard1/25/high.webp",
    tilt: 9,
    delay: 1.4,
    className: "-left-12 top-[280px] w-[76px]",
  },
];

/** Titre de vitrine : un mot mis en pastille, comme sur les captures de store. */
function Caption({
  before,
  word,
  after,
  className,
}: {
  before?: string;
  word: string;
  after?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-center text-[24px] font-black leading-[1.15] tracking-tight text-text-primary xl:text-[27px]",
        className,
      )}
    >
      {before}
      {before && <br />}
      <span className="inline-block rounded-2xl bg-accent px-3 text-white">{word}</span>
      {after && <> {after}</>}
    </p>
  );
}

/** Détail agrandi de la capture, posé sur le téléphone. */
function Zoom({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute left-1/2 z-10 -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(28,33,96,0.18)]",
        className,
      )}
    >
      <Image src={src} alt={alt} width={width} height={height} sizes="320px" loading="eager" className="h-auto w-full" />
    </div>
  );
}

/**
 * Vitrines du héros : chaque téléphone montre l'application telle qu'elle est,
 * avec un détail agrandi quand il compte. Ordre : la cote, les euros, le scan,
 * les variations, la fiche, le partage.
 */
const SLIDES: ImageItem[] = [
  {
    src: "/screenshots/result.webp",
    alt: "Fiche d'une carte reconnue : Dracaufeu du Set de Base",
    caption: <Caption before="Connais la vraie" word="cote" />,
    overlay: (
      <Zoom
        src="/screenshots/zoom-price.webp"
        alt="Cote de référence Cardmarket de la carte, en euros, avec sa variation sur 30 jours"
        width={985}
        height={440}
        className="-bottom-5 w-[136%]"
      />
    ),
  },
  {
    src: "/screenshots/home.webp",
    alt: "Tableau de bord : valeur totale de la collection, variation sur 30 jours et dernières cartes",
    caption: (
      <p className="flex flex-col items-center gap-2">
        <span className="rounded-[18px] bg-accent px-5 py-1 text-[26px] font-black leading-tight tracking-tight text-white shadow-[0_12px_28px_rgba(79,95,230,0.35)]">
          En euros
        </span>
        <span className="text-[22px] font-black leading-none tracking-tight text-text-primary xl:text-[24px]">
          Cotes Cardmarket
        </span>
      </p>
    ),
    overlay: (
      <>
        {CARDS.map((c) => (
          <div
            key={c.src}
            aria-hidden
            className={cn("float-card absolute z-10", c.className)}
            style={{ "--tilt": `${c.tilt}deg`, animationDelay: `${c.delay}s` } as React.CSSProperties}
          >
            <Image src={c.src} alt="" width={84} height={117} className="h-auto w-full rounded-[6px]" />
          </div>
        ))}
      </>
    ),
  },
  {
    src: "/screenshots/reveal.webp",
    alt: "Carte reconnue : la photo du Dracaufeu, cernée de vert, avec sa cote de 1 349 € en gros par-dessus",
    caption: <Caption before="Une photo, la" word="cote" />,
  },
  {
    src: "/screenshots/collection.webp",
    alt: "Collection triée par variation sur 30 jours",
    caption: <Caption before="Ce qui monte," word="ce qui baisse" />,
    overlay: (
      <Zoom
        src="/screenshots/zoom-row.webp"
        alt="Une carte de la collection, Drascore, avec sa cote et sa hausse de 69,7 % sur 30 jours"
        width={1110}
        height={305}
        className="top-[44%] w-[128%]"
      />
    ),
  },
  {
    src: "/screenshots/result.webp",
    alt: "Fiche d'une carte reconnue, détails de la carte",
    caption: <Caption before="Toute la" word="fiche" />,
    overlay: (
      <Zoom
        src="/screenshots/zoom-details.webp"
        alt="Détails de la carte : numéro 4/102, rareté Rare, type Feu, extension Set de Base, sortie le 9 janvier 1999"
        width={1074}
        height={620}
        className="-bottom-6 w-[126%]"
      />
    ),
  },
  {
    src: "/screenshots/public.webp",
    alt: "Page publique d'une collection : valeur totale, nombre de cartes et liste des cartes",
    caption: <Caption before="Partage ta" word="collection" />,
  },
];

export function HeroShowcase() {
  return (
    <div className="rounded-[32px] bg-[#f7f3ee] px-3 pb-5 pt-4 sm:px-6">
      <PhoneCarousel images={SLIDES} />
    </div>
  );
}
