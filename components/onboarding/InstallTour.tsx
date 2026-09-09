"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  EllipsisVertical,
  Layers,
  MonitorDown,
  Share,
  Smartphone,
  SquarePlus,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

/** Événement fenêtre qui rouvre le tutoriel, depuis les Paramètres. */
export const INSTALL_TOUR_EVENT = "mintcard:install-tour";
/** Mémoire par appareil : installer se fait appareil par appareil, pas compte par compte. */
const STORAGE_KEY = "mintcard:install-tour";
/** Le tutoriel attend que la page soit posée avant de monter. */
const FIRST_OPEN_DELAY_MS = 900;

type Platform = "ios-safari" | "ios-other" | "android" | "desktop";
type Browser = "safari" | "chrome";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type EdgeArrow = "bottom-center" | "top-right";

type Step = {
  title: string;
  text: string;
  mock: ReactNode;
  /** Flèche au bord de l'écran, vers le vrai bouton du navigateur. */
  edge?: EdgeArrow;
  /** Écran de choix du navigateur : les deux boutons remplacent « Suivant ». */
  choose?: boolean;
  /** Le navigateur propose l'installation lui-même : vrai bouton Installer. */
  native?: boolean;
};

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "ios-other" : "ios-safari";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function remember(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Stockage indisponible (navigation privée) : le tutoriel reviendra, sans conséquence.
  }
}

function alreadySeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return true;
  }
}

/**
 * Tutoriel d'installation sur l'écran d'accueil. S'ouvre de lui-même au
 * premier passage sur un téléphone, jamais une fois l'app installée, et se
 * rouvre depuis les Paramètres. Les étapes suivent le navigateur : Safari et
 * son bouton Partager, Chrome et son menu, ou le bouton d'installation natif
 * quand le navigateur le propose.
 */
export function InstallTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [standalone, setStandalone] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [browser, setBrowser] = useState<Browser | null>(null);
  const promptRef = useRef<InstallPromptEvent | null>(null);

  useEffect(() => {
    const detected = detectPlatform();
    const inApp = isStandalone();
    setPlatform(detected);
    setStandalone(inApp);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as InstallPromptEvent;
      setHasPrompt(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      remember("done");
    };
    const onReplay = () => {
      setStep(0);
      setBrowser(null);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(INSTALL_TOUR_EVENT, onReplay);

    const mobile = detected !== "desktop";
    const timer = !inApp && mobile && !alreadySeen() ? window.setTimeout(() => setOpen(true), FIRST_OPEN_DELAY_MS) : 0;

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(INSTALL_TOUR_EVENT, onReplay);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // La page derrière ne défile pas tant que le tutoriel est ouvert.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const close = useCallback(() => {
    remember("done");
    setOpen(false);
  }, []);

  async function install() {
    const event = promptRef.current;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    promptRef.current = null;
    setHasPrompt(false);
    if (outcome === "accepted") {
      setInstalled(true);
      remember("done");
    }
  }

  if (!open) return null;

  const done = standalone || installed;
  const mobile = platform !== "desktop";
  const chooses = mobile && !done;
  const detectedBrowser: Browser = platform === "ios-safari" ? "safari" : "chrome";
  const guide = done
    ? doneSteps()
    : guideFor(mobile ? pathFor(platform, browser ?? detectedBrowser) : "desktop", hasPrompt);
  const steps = chooses ? [chooserStep(), ...guide] : guide;
  const current = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;
  const choosing = chooses && step === 0;
  const browsers: Browser[] = detectedBrowser === "safari" ? ["safari", "chrome"] : ["chrome", "safari"];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-tour-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="tour-backdrop absolute inset-0" onClick={close} aria-hidden />

      {current.edge && <EdgeArrow at={current.edge} />}

      <div className="page-enter relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-[28px] bg-[#f4f5fc] px-5 pb-5 pt-6 shadow-card">
        <button
          type="button"
          onClick={close}
          className="absolute right-5 top-3 text-[11px] font-medium text-text-muted transition-colors hover:text-text-secondary"
        >
          Passer
        </button>

        <div key={step} className="page-enter flex flex-col items-center gap-4 text-center">
          <div className="w-full">{current.mock}</div>
          <div className="flex flex-col gap-1.5">
            <h2 id="install-tour-title" className="text-xl font-black tracking-tight text-text-primary">
              {current.title}
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary">{current.text}</p>
          </div>
        </div>

        {choosing && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {browsers.map((b) => {
              const detected = b === detectedBrowser;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBrowser(b);
                    setStep(1);
                  }}
                  className={cn(
                    "pressable relative flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-white py-3 text-sm font-bold text-text-primary ring-1 ring-black/5",
                    detected && "ring-2 ring-accent",
                  )}
                >
                  {b === "safari" ? <SafariMark /> : <ChromeMark />}
                  {b === "safari" ? "Safari" : "Chrome"}
                  {detected && (
                    <span className="absolute -top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                      Détecté
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-label={`Étape ${step + 1} sur ${steps.length}`}>
            {steps.length > 1 &&
              steps.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-[width,background-color] duration-[var(--dur-spring-quick)] ease-[var(--ease-spring-quick)]",
                    i === step ? "w-5 bg-accent" : "w-1.5 bg-black/15",
                  )}
                />
              ))}
          </div>

          {!choosing && (
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary py-2.5">
                  Retour
                </button>
              )}
              {current.native ? (
                <button type="button" onClick={install} className="btn-primary py-2.5">
                  Installer
                </button>
              ) : last ? (
                <button type="button" onClick={close} className="btn-primary py-2.5">
                  {done ? "Fermer" : "C'est fait"}
                </button>
              ) : (
                <button type="button" onClick={() => setStep(step + 1)} className="btn-primary py-2.5">
                  Suivant
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function doneSteps(): Step[] {
  return [
    {
      title: "Déjà installée",
      text: `${APP_NAME} est sur ton écran d'accueil : tu l'utilises en plein écran, comme une vraie app.`,
      mock: <AppBadge done />,
    },
  ];
}

function chooserStep(): Step {
  return {
    title: `Installe ${APP_NAME}`,
    text: "Plein écran, sans barre d'adresse, plus rapide à ouvrir. Avec quel navigateur es-tu ?",
    mock: <AppBadge />,
    choose: true,
  };
}

/** Safari n'existe que sur iPhone ; Chrome suit l'appareil. */
function pathFor(platform: Platform, browser: Browser): Platform {
  if (browser === "safari") return "ios-safari";
  return platform === "android" ? "android" : "ios-other";
}

function guideFor(platform: Platform, hasPrompt: boolean): Step[] {
  if (platform === "android" && hasPrompt) {
    return [
      {
        title: "Appuie sur Installer",
        text: `Chrome propose l'installation lui-même : un appui, et l'icône ${APP_NAME} est sur ton écran d'accueil.`,
        mock: <InstallDialog />,
        native: true,
      },
    ];
  }
  if (platform === "ios-safari" || platform === "ios-other") {
    const safari = platform === "ios-safari";
    return [
      {
        title: "Appuie sur Partager",
        text: safari
          ? "Le carré avec une flèche, dans la barre en bas de Safari."
          : "Le carré avec une flèche, à côté de la barre d'adresse.",
        mock: safari ? <SafariBar /> : <IosOtherBar />,
        edge: safari ? "bottom-center" : "top-right",
      },
      {
        title: "Choisis « Sur l'écran d'accueil »",
        text: "Fais défiler la liste si tu ne le vois pas tout de suite.",
        mock: <ShareSheet />,
      },
      {
        title: "Appuie sur Ajouter",
        text: `En haut à droite. ${APP_NAME} s'ouvre ensuite en plein écran, sans barre d'adresse.`,
        mock: <AddDialog />,
      },
    ];
  }
  if (platform === "android") {
    return [
      {
        title: "Ouvre le menu",
        text: "Les trois points, en haut à droite de Chrome.",
        mock: <ChromeBar />,
        edge: "top-right",
      },
      {
        title: "Choisis « Ajouter à l'écran d'accueil »",
        text: "Selon la version, la ligne s'appelle « Installer l'application ».",
        mock: <ChromeMenu />,
      },
      {
        title: "Confirme avec Installer",
        text: `L'icône ${APP_NAME} apparaît sur ton écran d'accueil.`,
        mock: <InstallDialog />,
      },
    ];
  }
  return [
    {
      title: "Clique sur l'icône d'installation",
      text: "Dans la barre d'adresse, à droite. Chrome et Edge la proposent ; Safari et Firefox non : sur ton téléphone, suis le tutoriel.",
      mock: <DesktopBar />,
    },
    {
      title: "Confirme avec Installer",
      text: `${APP_NAME} s'ouvre alors dans sa propre fenêtre, sans onglets ni barre d'adresse.`,
      mock: <InstallDialog />,
    },
  ];
}

function SafariMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="14" cy="14" r="12" fill="#F2F7FD" stroke="#1B8DE0" strokeWidth="2" />
      <path d="M19.5 8.5 16 16l-4-4z" fill="#E5322D" />
      <path d="M8.5 19.5 12 12l4 4z" fill="#9AA3B2" />
    </svg>
  );
}

function ChromeMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <path d="M14 14 3.61 8A12 12 0 0 1 24.39 8Z" fill="#DB4437" />
      <path d="M14 14 24.39 8A12 12 0 0 1 14 26Z" fill="#F4B400" />
      <path d="M14 14v12A12 12 0 0 1 3.61 8Z" fill="#0F9D58" />
      <circle cx="14" cy="14" r="5.5" fill="#fff" />
      <circle cx="14" cy="14" r="4" fill="#4285F4" />
    </svg>
  );
}

/** Flèche au bord de l'écran, qui pointe vers le vrai bouton du navigateur. */
function EdgeArrow({ at }: { at: EdgeArrow }) {
  if (at === "bottom-center") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-1 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
      >
        <span className="text-xs font-bold">C&apos;est ce bouton</span>
        <ArrowDown size={34} strokeWidth={2.6} className="tour-nudge" style={{ "--nudge-y": "10px" } as React.CSSProperties} />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex flex-col items-end gap-1 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
    >
      <ArrowUp size={34} strokeWidth={2.6} className="tour-nudge" style={{ "--nudge-y": "-10px" } as React.CSSProperties} />
      <span className="text-xs font-bold">C&apos;est ce bouton</span>
    </div>
  );
}

/* ---- Maquettes du navigateur : le bouton à presser est cerné et fléché. ---- */

function Mock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[280px] overflow-visible rounded-2xl bg-white p-3 text-text-primary shadow-inner ring-1 ring-black/5", className)}>
      {children}
    </div>
  );
}

/** Le bouton visé : anneau qui pulse, flèche qui insiste. */
function Target({ children, arrow = "down", className }: { children: ReactNode; arrow?: "down" | "left"; className?: string }) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <span className="tour-target inline-flex items-center justify-center rounded-xl bg-accent/10 text-accent ring-2 ring-accent">
        {children}
      </span>
      {arrow === "down" ? (
        <ArrowDown
          size={22}
          strokeWidth={2.8}
          className="tour-nudge absolute -top-8 left-1/2 -translate-x-1/2 text-accent"
          style={{ "--nudge-y": "6px" } as React.CSSProperties}
        />
      ) : (
        <ArrowLeft
          size={22}
          strokeWidth={2.8}
          className="tour-nudge absolute -right-8 top-1/2 -translate-y-1/2 text-accent"
          style={{ "--nudge-x": "-6px", "--nudge-y": "0px" } as React.CSSProperties}
        />
      )}
    </span>
  );
}

function AppIcon({ size = 44 }: { size?: number }) {
  return <Image src="/icons/icon.svg" alt="" width={size} height={size} />;
}

function AppBadge({ done }: { done?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative">
        <AppIcon size={84} />
        {done && (
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-up text-white ring-4 ring-[#f4f5fc]">
            <Check size={18} strokeWidth={3} />
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-text-primary">{APP_NAME}</span>
    </div>
  );
}

function SafariBar() {
  return (
    <Mock className="pt-10">
      <div className="flex items-center justify-between rounded-xl bg-[#f2f2f7] px-3 py-2 text-text-muted">
        <ChevronLeft size={22} />
        <ChevronRight size={22} className="opacity-40" />
        <Target>
          <span className="p-1.5">
            <Share size={22} strokeWidth={2.2} />
          </span>
        </Target>
        <BookOpen size={22} />
        <Layers size={22} />
      </div>
    </Mock>
  );
}

function IosOtherBar() {
  return (
    <Mock className="pt-10">
      <div className="flex items-center gap-2 rounded-xl bg-[#f2f2f7] px-3 py-2">
        <span className="flex-1 truncate rounded-lg bg-white px-3 py-1.5 text-xs text-text-secondary">mintcard.app</span>
        <Target>
          <span className="p-1.5">
            <Share size={20} strokeWidth={2.2} />
          </span>
        </Target>
      </div>
    </Mock>
  );
}

function ShareSheet() {
  const rows = [
    { icon: <Copy size={18} />, label: "Copier" },
    { icon: <Bookmark size={18} />, label: "Ajouter aux favoris" },
    { icon: <SquarePlus size={18} />, label: "Sur l'écran d'accueil", target: true },
    { icon: <Star size={18} />, label: "Marquer" },
  ];
  return (
    <Mock className="pr-10">
      <div className="mb-2 flex items-center gap-2 border-b border-black/5 pb-2">
        <AppIcon size={28} />
        <span className="text-xs font-semibold">{APP_NAME}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.label}>
            {r.target ? (
              <Target arrow="left" className="w-full">
                <span className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold">
                  {r.label}
                  {r.icon}
                </span>
              </Target>
            ) : (
              <span className="flex items-center justify-between px-3 py-2 text-sm text-text-secondary">
                {r.label}
                <span className="text-text-muted">{r.icon}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </Mock>
  );
}

function AddDialog() {
  return (
    <Mock className="pt-10">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-text-secondary">Annuler</span>
        <span className="text-xs font-semibold">Sur l&apos;écran d&apos;accueil</span>
        <Target>
          <span className="px-2 py-1 text-sm font-bold">Ajouter</span>
        </Target>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#f2f2f7] p-2.5">
        <AppIcon size={40} />
        <span className="flex flex-col text-left">
          <span className="text-sm font-semibold">{APP_NAME}</span>
          <span className="text-[11px] text-text-muted">mintcard.app/home</span>
        </span>
      </div>
    </Mock>
  );
}

function ChromeBar() {
  return (
    <Mock className="pt-10">
      <div className="flex items-center gap-2 rounded-full bg-[#f1f3f4] py-1.5 pl-3 pr-2">
        <span className="flex-1 truncate text-xs text-text-secondary">mintcard.app</span>
        <Target>
          <span className="p-1">
            <EllipsisVertical size={20} strokeWidth={2.4} />
          </span>
        </Target>
      </div>
    </Mock>
  );
}

function ChromeMenu() {
  const rows = [
    { icon: <Star size={18} />, label: "Favoris" },
    { icon: <Copy size={18} />, label: "Partager…" },
    { icon: <Smartphone size={18} />, label: "Ajouter à l'écran d'accueil", target: true },
    { icon: <MonitorDown size={18} />, label: "Version ordinateur" },
  ];
  return (
    <Mock className="pr-10">
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.label}>
            {r.target ? (
              <Target arrow="left" className="w-full">
                <span className="flex w-full items-center gap-3 px-3 py-2 text-sm font-semibold">
                  {r.icon}
                  {r.label}
                </span>
              </Target>
            ) : (
              <span className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary">
                <span className="text-text-muted">{r.icon}</span>
                {r.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Mock>
  );
}

function InstallDialog() {
  return (
    <Mock className="pt-3">
      <p className="text-left text-sm font-semibold">Installer l&apos;application ?</p>
      <div className="mt-2 flex items-center gap-3">
        <AppIcon size={40} />
        <span className="flex flex-col text-left">
          <span className="text-sm font-semibold">{APP_NAME}</span>
          <span className="text-[11px] text-text-muted">mintcard.app</span>
        </span>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 pt-6 text-sm">
        <span className="text-text-secondary">Annuler</span>
        <Target>
          <span className="px-3 py-1.5 text-sm font-bold">Installer</span>
        </Target>
      </div>
    </Mock>
  );
}

function DesktopBar() {
  return (
    <Mock className="pt-10">
      <div className="flex items-center gap-2 rounded-full bg-[#f1f3f4] py-1.5 pl-3 pr-2">
        <span className="flex-1 truncate text-xs text-text-secondary">mintcard.app/home</span>
        <Target>
          <span className="p-1">
            <MonitorDown size={18} strokeWidth={2.4} />
          </span>
        </Target>
        <Star size={16} className="text-text-muted" />
      </div>
    </Mock>
  );
}
