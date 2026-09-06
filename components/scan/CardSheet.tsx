"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { prefersReducedMotion, project, rubberband, spring, velocityFrom, type SpringHandle } from "@/lib/motion";

export type CardSheetHandle = {
  /** Fait descendre la feuille, puis appelle `then` une fois hors champ. */
  dismiss: (then: () => void) => void;
};

type Props = {
  /** Ce qu'on retrouve en tirant la feuille : le monde de la caméra, en retrait. */
  backdrop: React.ReactNode;
  onDismiss: () => void;
  children: React.ReactNode;
};

/** Course avant qu'un mouvement du doigt soit tenu pour un glissement et non un appui. */
const HYSTERESIS_PX = 10;

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  baseY: number;
  scrollTopAtStart: number;
  /** null : intention pas encore connue ; false : c'est un défilement, on laisse faire. */
  committed: boolean | null;
  samples: { y: number; t: number }[];
};

/**
 * Feuille qui monte depuis la caméra et qu'on tire vers le bas pour y revenir.
 *
 * La valeur animée vit dans une ref et est écrite directement dans le
 * transform : la feuille suit le doigt 1:1, un geste peut l'attraper en plein
 * vol (le ressort en cours est annulé et repart de la position affichée), et
 * au lâcher le ressort hérite de la vitesse du doigt. La destination se lit sur
 * l'élan projeté, pas sur la position au lâcher : une pichenette suffit.
 */
export const CardSheet = forwardRef<CardSheetHandle, Props>(function CardSheet(
  { backdrop, onDismiss, children },
  ref,
) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const yRef = useRef(0);
  const heightRef = useRef(0);
  const animRef = useRef<SpringHandle | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const draggedRef = useRef(false);
  const leavingRef = useRef(false);

  function apply(y: number) {
    yRef.current = y;
    const sheet = sheetRef.current;
    const back = backdropRef.current;
    if (!sheet || !back) return;
    sheet.style.transform = `translate3d(0, ${y}px, 0)`;
    // Le fond, poussé en arrière sous la feuille, revient à sa place à mesure qu'on la tire.
    const p = heightRef.current ? Math.min(1, Math.max(0, y / heightRef.current)) : 0;
    back.style.transform = `scale(${0.94 + 0.06 * p})`;
    back.style.opacity = String(0.55 + 0.45 * p);
  }

  function animateTo(
    target: number,
    velocity: number,
    opts: { damping: number; response: number },
    then?: () => void,
  ) {
    animRef.current?.cancel();
    animRef.current = spring(yRef.current, target, velocity, opts, apply, () => {
      animRef.current = null;
      then?.();
    });
  }

  function leave(then: () => void) {
    if (leavingRef.current) return;
    leavingRef.current = true;
    const sheet = sheetRef.current;
    if (prefersReducedMotion() || !sheet) {
      if (sheet) {
        sheet.style.transition = "opacity 200ms ease";
        sheet.style.opacity = "0";
        setTimeout(then, 200);
      } else then();
      return;
    }
    animateTo(heightRef.current, 0, { damping: 1, response: 0.35 }, then);
  }

  useImperativeHandle(ref, () => ({ dismiss: leave }));

  // Arrivée : la feuille part du bas de sa zone et vient se poser sans rebond.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    heightRef.current = sheet.offsetHeight;
    if (prefersReducedMotion()) {
      apply(0);
      sheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease" });
      return;
    }
    apply(heightRef.current);
    animateTo(0, 0, { damping: 1, response: 0.45 });
    return () => {
      animRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tant que la feuille est en haut de son contenu et qu'on la tire vers le
  // bas, le navigateur ne doit pas prendre la main pour défiler : sans cela il
  // annulerait le pointeur et la feuille resterait figée sous le doigt.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const onTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!g) return;
      const pullingDown = e.touches[0] && e.touches[0].clientY > g.startY;
      if (g.committed === true || (g.committed === null && g.scrollTopAtStart === 0 && pullingDown)) {
        e.preventDefault();
      }
    };
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => sheet.removeEventListener("touchmove", onTouchMove);
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (leavingRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Attraper la feuille en plein vol : on repart de là où elle est, pas de sa cible.
    const live = animRef.current?.cancel();
    animRef.current = null;
    if (live) yRef.current = live.value;
    heightRef.current = sheet.offsetHeight;
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseY: yRef.current,
      scrollTopAtStart: sheet.scrollTop,
      committed: null,
      samples: [{ y: e.clientY, t: performance.now() }],
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId || g.committed === false) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (g.committed === null) {
      if (Math.abs(dx) < HYSTERESIS_PX && Math.abs(dy) < HYSTERESIS_PX) return;
      const wantsSheet = (dy > 0 && g.scrollTopAtStart === 0 && Math.abs(dy) > Math.abs(dx)) || g.baseY > 0;
      if (!wantsSheet) {
        g.committed = false;
        return;
      }
      g.committed = true;
      try {
        sheetRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Pointeur déjà relâché entre deux événements : le suivi continue sans capture.
      }
    }

    let y = g.baseY + dy;
    if (y < 0) y = rubberband(y, heightRef.current);
    apply(y);
    g.samples.push({ y: e.clientY, t: performance.now() });
    if (g.samples.length > 8) g.samples.shift();
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gestureRef.current = null;
    if (g.committed !== true) return;

    // Le clic éventuel de ce même geste suit immédiatement le relâchement ;
    // le prochain appui, lui, doit passer.
    draggedRef.current = true;
    setTimeout(() => {
      draggedRef.current = false;
    }, 0);

    const velocity = velocityFrom(g.samples);
    const height = heightRef.current;
    const projected = yRef.current + project(velocity);

    if (projected > height * 0.5) {
      leavingRef.current = true;
      animateTo(height, velocity, { damping: 1, response: 0.35 }, onDismiss);
    } else {
      // Retour en place : le geste avait de l'élan, un léger rebond est légitime.
      animateTo(0, velocity, { damping: 0.8, response: 0.3 });
    }
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={backdropRef}
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-[28px] bg-[#101438] shadow-card will-change-transform"
      >
        {backdrop}
      </div>

      <div
        ref={sheetRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          // Un glissement ne doit pas se terminer par le clic du bouton sous le doigt.
          if (draggedRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className="card-sheet absolute inset-0 overflow-y-auto overscroll-contain rounded-t-[28px] will-change-transform"
        style={{ touchAction: "pan-y" }}
      >
        <div className="sticky top-0 z-10 flex justify-center pb-1 pt-2" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-text-primary/20" />
        </div>
        {children}
      </div>
    </div>
  );
});
