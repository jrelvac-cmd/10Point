"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Layers, Loader2, Plus, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CardDetector,
  SAMPLE_HEIGHT,
  SAMPLE_INTERVAL_MS,
  SAMPLE_WIDTH,
  toGray,
  type DetectorState,
} from "@/lib/card-detect";

type CameraState = "starting" | "ready" | "refused" | "unavailable";

type Props = {
  burstActive: boolean;
  /** Faux après un résultat : la carte doit bouger avant d'être scannée de nouveau. */
  armedAtStart: boolean;
  /** Pastille affichée au-dessus des boutons : état de la rafale, ou rien. */
  notice: React.ReactNode;
  onCapture: (file: File) => void;
  onImport: () => void;
  onNativeCamera: () => void;
  onToggleBurst: () => void;
};

/**
 * Visée caméra dans la page, sur toute la hauteur disponible.
 *
 * Un `input capture` laisse la main à l'appli photo du téléphone, sur laquelle
 * l'application ne peut rien afficher : il faut un flux vidéo pour poser
 * l'import et la rafale au bord du cadre. La caméra ne tourne que tant que ce
 * composant est monté, donc jamais pendant la lecture d'un résultat.
 */
export function Viewfinder({
  burstActive,
  armedAtStart,
  notice,
  onCapture,
  onImport,
  onNativeCamera,
  onToggleBurst,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [shooting, setShooting] = useState(false);
  const [detect, setDetect] = useState<DetectorState>("idle");
  const shootRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }

    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } } })
      .then((granted) => {
        // L'utilisateur a pu quitter l'écran pendant qu'il répondait à la
        // demande d'autorisation ; sans cela la caméra resterait allumée.
        if (cancelled) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = granted;
        // L'état passe à « prêt » sur loadedmetadata, pas ici : entre les deux,
        // la vidéo n'a pas encore ses dimensions et le déclencheur ne
        // capturerait rien.
        if (videoRef.current) videoRef.current.srcObject = granted;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : "";
        setState(name === "NotAllowedError" || name === "SecurityError" ? "refused" : "unavailable");
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function shoot() {
    const video = videoRef.current;
    if (!video?.videoWidth || shooting) return;
    setShooting(true);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      setShooting(false);
      return;
    }
    onCapture(new File([blob], "scan.jpg", { type: "image/jpeg" }));
  }

  shootRef.current = shoot;

  // Scan automatique : toutes les 150 ms, une vignette de la zone de cadrage
  // est lue dans le flux ; une carte nette et immobile pendant ~600 ms
  // déclenche la reconnaissance sans appui. Le bouton reste disponible.
  useEffect(() => {
    if (state !== "ready") return;
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const gray = new Uint8ClampedArray(SAMPLE_WIDTH * SAMPLE_HEIGHT);
    const detector = new CardDetector(armedAtStart);
    let fired = false;

    const tick = () => {
      if (fired || document.hidden || !video.videoWidth) return;
      // Zone de cadrage : au format carte, 60 % de la hauteur, un peu au-dessus
      // du centre comme le repère à l'écran.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      let ch = vh * 0.6;
      let cw = (ch * 63) / 88;
      if (cw > vw * 0.9) {
        cw = vw * 0.9;
        ch = (cw * 88) / 63;
      }
      ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2 - vh * 0.04, cw, ch, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const { data } = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const result = detector.feed(toGray(data, gray), SAMPLE_WIDTH, SAMPLE_HEIGHT);
      setDetect(result.state);
      if (result.fire) {
        fired = true;
        navigator.vibrate?.(10);
        shootRef.current();
      }
    };

    const id = setInterval(tick, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state, armedAtStart]);

  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[28px] bg-gradient-to-b from-[#2a2f5e] to-[#0f1340] shadow-card">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => setState("ready")}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          state === "ready" ? "opacity-100" : "opacity-0",
        )}
      />

      <Image
        src="/icons/icon.svg"
        alt=""
        width={44}
        height={44}
        className="pointer-events-none absolute left-1/2 top-5 h-11 w-11 -translate-x-1/2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        priority
      />

      {state === "starting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-white/80" size={26} />
          <p className="text-sm text-white/70">Ouverture de la caméra…</p>
        </div>
      )}

      {(state === "refused" || state === "unavailable") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white">
            <Camera size={26} />
          </span>
          <p className="text-sm leading-relaxed text-white/85">
            {state === "refused"
              ? "L'accès à la caméra est bloqué. Autorise-le dans les réglages de ton navigateur, ou prends la photo avec l'appareil photo du téléphone."
              : "La caméra n'est pas accessible ici. Prends la photo avec l'appareil photo du téléphone."}
          </p>
          <button
            type="button"
            onClick={onNativeCamera}
            className="pressable rounded-full bg-white px-5 py-3 text-sm font-semibold text-text-primary"
          >
            Ouvrir l&apos;appareil photo
          </button>
          <button type="button" onClick={onImport} className="text-xs text-white/70 underline">
            Importer une photo
          </button>
        </div>
      )}

      {state === "ready" && (
        <>
          {/* Repère de cadrage au format d'une carte (63 × 88 mm) : seulement
              les coins, pour ne pas masquer la carte. */}
          <div className={FRAME_AREA}>
            <div className={FRAME}>
              {CORNERS.map((c) => (
                <Corner key={c} locked={detect === "locked"} className={c} />
              ))}
              {/* Sous le repère : ce que la détection voit, pour que l'attente se comprenne. */}
              <p
                aria-live="polite"
                className={cn(
                  "absolute -bottom-9 left-1/2 w-max -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur transition-colors",
                  detect === "locked" && "bg-emerald-400/90 text-[#0b2a18]",
                  detect === "holding" && "bg-white/85 text-text-primary",
                  detect === "parked" && "bg-black/45 text-white/85",
                  detect === "idle" && "bg-black/35 text-white/70",
                )}
              >
                {detect === "locked"
                  ? "Carte détectée"
                  : detect === "holding"
                    ? "Ne bouge plus…"
                    : detect === "parked"
                      ? "Présente une autre carte, ou appuie"
                      : "Place une carte dans le cadre"}
              </p>
            </div>
          </div>

          {notice && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[112px] flex justify-center px-6">
              <span className="pointer-events-auto rounded-full bg-black/55 px-3 py-1.5 text-center text-[11px] font-medium text-white backdrop-blur">
                {notice}
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-8 pb-7">
            <RoundButton label="Importer une photo" onClick={onImport}>
              <Plus size={22} strokeWidth={2.5} />
            </RoundButton>

            <button
              type="button"
              onClick={shoot}
              disabled={shooting}
              aria-label="Prendre la photo"
              className="pressable pressable-strong flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_28px_rgba(79,95,230,0.55)] disabled:opacity-60"
            >
              <ScanLine size={26} />
            </button>

            <RoundButton
              label={burstActive ? "Arrêter le scan en rafale" : "Scanner plusieurs cartes"}
              onClick={onToggleBurst}
              active={burstActive}
            >
              <Layers size={20} />
            </RoundButton>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Repère de cadrage au format carte, 64 % de la hauteur, un peu au-dessus du
 * centre. Les scènes qui suivent la photo reposent le même cadre au même
 * endroit : la carte cadrée y reste sous les coins.
 */
export const FRAME_AREA = "pointer-events-none absolute inset-0 flex items-center justify-center pb-24 pt-10";
export const FRAME = "relative aspect-[63/88] h-[64%]";
export const CORNERS = [
  "left-0 top-0 rounded-tl-[22px] border-l-[9px] border-t-[9px]",
  "right-0 top-0 rounded-tr-[22px] border-r-[9px] border-t-[9px]",
  "bottom-0 left-0 rounded-bl-[22px] border-b-[9px] border-l-[9px]",
  "bottom-0 right-0 rounded-br-[22px] border-b-[9px] border-r-[9px]",
];

function Corner({ className, locked }: { className: string; locked: boolean }) {
  return (
    <span
      className={cn(
        "absolute h-14 w-14 transition-colors duration-150",
        locked
          ? "border-emerald-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.9)]"
          : "border-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]",
        className,
      )}
    />
  );
}

function RoundButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "pressable pressable-strong flex h-12 w-12 items-center justify-center rounded-full shadow-inner",
        active ? "bg-accent text-white ring-2 ring-white/80" : "bg-white text-text-primary hover:bg-white/90",
      )}
    >
      {children}
    </button>
  );
}
