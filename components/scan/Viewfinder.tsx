"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Layers, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type CameraState = "starting" | "ready" | "refused" | "unavailable";

type Props = {
  burstActive: boolean;
  /** Pastille affichée au-dessus des boutons : état de la rafale, ou rien. */
  notice: React.ReactNode;
  onCapture: (file: File) => void;
  onImport: () => void;
  onNativeCamera: () => void;
  onToggleBurst: () => void;
};

/**
 * Visée caméra dans la page.
 *
 * Un `input capture` laisse la main à l'appli photo du téléphone, sur laquelle
 * l'application ne peut rien afficher : il faut un flux vidéo pour poser
 * l'import et la rafale au bord du cadre. La caméra ne tourne que tant que ce
 * composant est monté, donc jamais pendant la lecture d'un résultat.
 */
export function Viewfinder({
  burstActive,
  notice,
  onCapture,
  onImport,
  onNativeCamera,
  onToggleBurst,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [shooting, setShooting] = useState(false);

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
    if (!video?.videoWidth) return;
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

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] bg-[#101438] shadow-card">
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
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-text-primary"
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
          {/* Repère de cadrage au format d'une carte (63 × 88 mm). */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-20">
            <div className="aspect-[63/88] h-[68%] rounded-2xl border-2 border-white/70" />
          </div>

          {notice && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[108px] flex justify-center px-6">
              <span className="pointer-events-auto rounded-full bg-black/55 px-3 py-1.5 text-center text-[11px] font-medium text-white backdrop-blur">
                {notice}
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-7 pb-7">
            <RoundButton label="Importer une photo" onClick={onImport}>
              <Plus size={22} />
            </RoundButton>

            <button
              type="button"
              onClick={shoot}
              disabled={shooting}
              aria-label="Prendre la photo"
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-white transition-transform active:scale-95 disabled:opacity-60"
            >
              <span className="h-[58px] w-[58px] rounded-full bg-white" />
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
        "flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition-colors",
        active ? "bg-white text-accent-dark" : "bg-white/25 text-white hover:bg-white/40",
      )}
    >
      {children}
    </button>
  );
}
