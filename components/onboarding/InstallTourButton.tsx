"use client";

import { useEffect, useState } from "react";
import { Check, Smartphone } from "lucide-react";
import { INSTALL_TOUR_EVENT } from "./InstallTour";
import { APP_NAME } from "@/lib/constants";

/** Rouvre le tutoriel d'installation ; dit quand l'app est déjà installée sur cet appareil. */
export function InstallTourButton() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
  }, []);

  return (
    <>
      <p className="flex items-center gap-2 text-xs text-text-secondary">
        {installed ? (
          <>
            <Check size={14} className="shrink-0 text-up" />
            {APP_NAME} est installée sur cet appareil.
          </>
        ) : (
          <>
            <Smartphone size={14} className="shrink-0 text-text-muted" />
            Sur ton écran d&apos;accueil, {APP_NAME} s&apos;ouvre en plein écran, sans barre d&apos;adresse.
          </>
        )}
      </p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(INSTALL_TOUR_EVENT))}
        className="btn-secondary mt-1"
      >
        {installed ? "Revoir le tutoriel" : "Installer l'app sur mon téléphone"}
      </button>
    </>
  );
}
