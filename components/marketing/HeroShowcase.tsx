"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneShot } from "./PhoneShot";

/** Cartes réelles qui s'échappent du téléphone, mêmes images que dans l'application. */
const CARDS = [
  {
    src: "https://assets.tcgdex.net/fr/base/base1/4/high.webp",
    tilt: -8,
    delay: 0,
    className: "-right-3 top-[200px] w-[92px]",
  },
  {
    src: "https://assets.tcgdex.net/fr/ecard/ecard1/25/high.webp",
    tilt: 9,
    delay: 1.4,
    className: "right-7 top-[318px] w-[84px]",
  },
];

const AUTOPLAY_MS = 4500;
/** Après un geste de l'utilisateur, le défilement automatique se tait un moment. */
const USER_PAUSE_MS = 10_000;

/**
 * Vitrines du héros, façon captures de store : chaque panneau montre
 * l'application telle qu'elle est, avec un détail agrandi quand il compte.
 * Défilement horizontal avec accroche, points, flèches, avance automatique
 * qui s'interrompt dès que l'utilisateur prend la main.
 */
export function HeroShowcase() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const userUntil = useRef(0);

  const step = useCallback(() => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return 1;
    return first.offsetWidth + parseFloat(getComputedStyle(track).columnGap || "16");
  }, []);

  const goTo = useCallback(
    (index: number, byUser = true) => {
      const track = trackRef.current;
      if (!track) return;
      if (byUser) userUntil.current = Date.now() + USER_PAUSE_MS;
      const target = Math.max(0, Math.min(SLIDES.length - 1, index));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({ left: target * step(), behavior: reduced ? "auto" : "smooth" });
    },
    [step],
  );

  // L'index courant se lit sur la position de défilement ; au bout, le
  // dernier panneau est actif même s'il n'est pas le premier visible.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
        setActive(atEnd ? SLIDES.length - 1 : Math.round(track.scrollLeft / step()));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [step]);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (document.hidden || Date.now() < userUntil.current) return;
      const track = trackRef.current;
      if (!track) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      goTo(atEnd ? 0 : active + 1, false);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [active, paused, goTo]);

  const markUser = () => {
    userUntil.current = Date.now() + USER_PAUSE_MS;
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onPointerDown={markUser}
        onWheel={markUser}
        onTouchStart={markUser}
        className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-6 px-6 pb-3 lg:mx-0 lg:scroll-pl-0 lg:px-0"
      >
        {SLIDES.map((slide) => (
          <Panel key={slide.key}>{slide.node}</Panel>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          aria-label="Vitrine précédente"
          className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-primary shadow-inner ring-1 ring-black/10 disabled:opacity-40"
          disabled={active === 0}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Vitrines">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Vitrine ${i + 1} sur ${SLIDES.length}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-2 rounded-full transition-[width,background-color] duration-[var(--dur-spring-quick)] ease-[var(--ease-spring-quick)]",
                i === active ? "w-6 bg-accent" : "w-2 bg-black/15 hover:bg-black/30",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          aria-label="Vitrine suivante"
          className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-primary shadow-inner ring-1 ring-black/10 disabled:opacity-40"
          disabled={active === SLIDES.length - 1}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[560px] w-[78%] shrink-0 snap-start flex-col items-center overflow-hidden rounded-[32px] bg-[#f7f3ee] px-5 pt-6 sm:w-[60%] lg:w-[calc(50%-8px)]">
      {children}
    </div>
  );
}

/** Titre de panneau : un mot mis en pastille, comme sur les captures de store. */
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
        "relative z-10 overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(28,33,96,0.18)]",
        className,
      )}
    >
      <Image src={src} alt={alt} width={width} height={height} sizes="300px" loading="eager" className="h-auto w-full" />
    </div>
  );
}

const SLIDES: { key: string; node: ReactNode }[] = [
  {
    key: "cote",
    node: (
      <>
        <div className="h-[330px] w-full overflow-hidden">
          <PhoneShot
            src="/screenshots/result.webp"
            alt="Fiche d'une carte reconnue : Dracaufeu du Set de Base"
            width={222}
            height={360}
            priority
            eager
            className="mx-auto"
          />
        </div>
        <Zoom
          src="/screenshots/zoom-price.webp"
          alt="Cote de référence Cardmarket de la carte, en euros, avec sa variation sur 30 jours"
          width={985}
          height={383}
          className="-mt-14 w-full"
        />
        <Caption before="Connais la vraie" word="cote" className="mt-6" />
      </>
    ),
  },
  {
    key: "euros",
    node: (
      <>
        <span className="rounded-[18px] bg-accent px-5 py-1 text-[28px] font-black leading-tight tracking-tight text-white shadow-[0_12px_28px_rgba(79,95,230,0.35)] xl:text-[32px]">
          En euros
        </span>
        <p className="mt-3 text-center text-[24px] font-black leading-none tracking-tight text-text-primary xl:text-[27px]">
          Cotes Cardmarket
        </p>
        <div className="relative mt-6 h-[400px] w-full">
          <PhoneShot
            src="/screenshots/home.webp"
            alt="Tableau de bord : valeur totale de la collection, variation sur 30 jours et dernières cartes"
            width={232}
            height={420}
            priority
            eager
            className="mx-auto"
          />
          {CARDS.map((c) => (
            <div
              key={c.src}
              aria-hidden
              className={cn("float-card absolute", c.className)}
              style={{ "--tilt": `${c.tilt}deg`, animationDelay: `${c.delay}s` } as React.CSSProperties}
            >
              <Image src={c.src} alt="" width={92} height={128} className="h-auto w-full rounded-[6px]" />
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    key: "scan",
    node: (
      <>
        <div className="h-[440px] w-full overflow-hidden pt-1">
          <PhoneShot
            src="/screenshots/scan.webp"
            alt="Le viseur reconnaît une carte Dracaufeu : coins verts et mention « Carte détectée »"
            width={196}
            full
            eager
            className="mx-auto"
          />
        </div>
        <Caption word="Scan" after="automatique" className="mt-4" />
      </>
    ),
  },
  {
    key: "variation",
    node: (
      <>
        <Caption before="Ce qui monte," word="ce qui baisse" />
        <div className="relative mt-5 h-[400px] w-full">
          <PhoneShot
            src="/screenshots/collection.webp"
            alt="Collection triée par variation sur 30 jours"
            width={232}
            height={420}
            eager
            className="mx-auto"
          />
          <Zoom
            src="/screenshots/zoom-row.webp"
            alt="Une carte de la collection avec sa cote et sa hausse de 69,7 % sur 30 jours"
            width={1047}
            height={288}
            className="absolute -left-2 top-[190px] w-[104%]"
          />
        </div>
      </>
    ),
  },
  {
    key: "fiche",
    node: (
      <>
        <div className="h-[330px] w-full overflow-hidden">
          <PhoneShot
            src="/screenshots/result.webp"
            alt="Fiche d'une carte reconnue, détails de la carte"
            width={222}
            height={360}
            align="bottom"
            eager
            className="mx-auto"
          />
        </div>
        <Zoom
          src="/screenshots/zoom-details.webp"
          alt="Détails de la carte : numéro 4/102, rareté Rare, type Feu, extension Set de Base, sortie le 9 janvier 1999"
          width={985}
          height={690}
          className="-mt-24 w-full"
        />
        <Caption before="Toute la" word="fiche" className="mt-5" />
      </>
    ),
  },
  {
    key: "partage",
    node: (
      <>
        <Caption before="Partage ta" word="collection" />
        <div className="mt-5 h-[420px] w-full overflow-hidden">
          <PhoneShot
            src="/screenshots/public.webp"
            alt="Page publique d'une collection : valeur totale, nombre de cartes et liste des cartes"
            width={232}
            height={440}
            eager
            className="mx-auto"
          />
        </div>
      </>
    ),
  },
];
