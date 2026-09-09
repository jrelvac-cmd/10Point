"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneShot, phoneHeight } from "@/components/marketing/PhoneShot";

export type ImageItem = {
  src: string;
  alt: string;
  /** Partie de la capture montrée si elle est recadrée ; sans effet sur un téléphone entier. */
  align?: "top" | "bottom";
  /** Titre affiché sous le carrousel quand ce téléphone est au centre. */
  caption?: ReactNode;
  /** Détail agrandi ou décor, posé sur le téléphone et emporté avec lui. */
  overlay?: ReactNode;
};

type Props = {
  images: ImageItem[];
  /** Largeur du téléphone central en pixels ; bornée par la place disponible. */
  width?: number;
  autoplayMs?: number;
  className?: string;
};

/** Après un geste de l'utilisateur, le défilement automatique se tait un moment. */
const USER_PAUSE_MS = 10_000;
/** Course minimale d'un glissement pour changer de téléphone. */
const SWIPE_PX = 40;
/** Marge sous le téléphone pour les détails agrandis qui dépassent. */
const OVERFLOW_PX = 44;

/**
 * Téléphones côte à côte en perspective : celui du centre de face, ses voisins
 * en retrait, tournés vers lui et estompés. Flèches, points, glissement au
 * doigt, clavier, avance automatique qui s'interrompt dès que l'utilisateur
 * prend la main. Le premier téléphone succède au dernier.
 */
export function PhoneCarousel({ images, width = 232, autoplayMs = 4500, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phoneWidth, setPhoneWidth] = useState(width);
  const userUntil = useRef(0);
  const dragStart = useRef<number | null>(null);
  const count = images.length;

  const goTo = useCallback(
    (index: number, byUser = true) => {
      if (byUser) userUntil.current = Date.now() + USER_PAUSE_MS;
      setActive(((index % count) + count) % count);
    },
    [count],
  );

  // Le téléphone central prend la moitié de la place, sans dépasser sa largeur nominale.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => setPhoneWidth(Math.max(176, Math.min(width, Math.round(root.clientWidth * 0.52))));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    return () => observer.disconnect();
  }, [width]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (document.hidden || Date.now() < userUntil.current) return;
      goTo(active + 1, false);
    }, autoplayMs);
    return () => clearInterval(id);
  }, [active, paused, count, autoplayMs, goTo]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") goTo(active + 1);
    if (e.key === "ArrowLeft") goTo(active - 1);
  }

  const height = phoneHeight(phoneWidth);
  const stepX = Math.round(phoneWidth * 0.62);
  const current = images[active];

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        role="region"
        aria-roledescription="carrousel"
        aria-label="Vitrines de l'application"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          dragStart.current = e.clientX;
        }}
        onPointerUp={(e) => {
          const start = dragStart.current;
          dragStart.current = null;
          if (start === null) return;
          const dx = e.clientX - start;
          if (Math.abs(dx) >= SWIPE_PX) goTo(active + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
        className="relative w-full select-none overflow-hidden rounded-2xl outline-none [perspective:1400px] focus-visible:ring-2 focus-visible:ring-accent/50"
        style={{ height: height + 24 + OVERFLOW_PX, touchAction: "pan-y" }}
      >
        {images.map((img, i) => {
          // Distance au centre, en tournant en rond : le dernier est le voisin de gauche du premier.
          let offset = i - active;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          const distance = Math.abs(offset);
          // Seuls le téléphone de face et ses deux voisins existent à l'écran ;
          // les voisins ne sont que des ombres estompées.
          const shown = distance <= 1;
          return (
            <div
              key={`${img.src}-${i}`}
              aria-hidden={offset !== 0}
              className="absolute left-1/2 top-6 will-change-transform transition-[transform,opacity,visibility] duration-[var(--dur-spring)] ease-[var(--ease-spring)]"
              style={{
                width: phoneWidth,
                transform: `translateX(calc(-50% + ${offset * stepX}px)) translateZ(${-distance * 150}px) rotateY(${-offset * 16}deg)`,
                opacity: shown ? 1 - distance * 0.55 : 0,
                visibility: shown ? "visible" : "hidden",
                zIndex: 10 - distance,
                pointerEvents: offset === 0 ? "auto" : "none",
              }}
            >
              <PhoneShot
                src={img.src}
                alt={img.alt}
                width={phoneWidth}
                full
                align={img.align}
                eager
                priority={i === 0}
                sizes={`${width}px`}
              />
              {/* Le détail agrandi n'accompagne que le téléphone de face. */}
              {img.overlay && (
                <div
                  className="transition-opacity duration-[var(--dur-spring)] ease-[var(--ease-spring)]"
                  style={{ opacity: offset === 0 ? 1 : 0 }}
                >
                  {img.overlay}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {current?.caption && (
        <div key={active} className="page-enter mt-1">
          {current.caption}
        </div>
      )}

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="Vitrine précédente"
            className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-primary shadow-inner ring-1 ring-black/10"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Vitrines">
            {images.map((img, i) => (
              <button
                key={`${img.src}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Vitrine ${i + 1} sur ${count}`}
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
            className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-primary shadow-inner ring-1 ring-black/10"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
