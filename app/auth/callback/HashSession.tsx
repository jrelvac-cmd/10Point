"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/auth-redirect";

/**
 * Récupère la session quand Supabase la renvoie dans le fragment d'URL
 * (`#access_token=…`), ce qu'il fait pour les liens de confirmation d'email.
 *
 * Un fragment n'est jamais transmis au serveur : sans ce composant côté
 * navigateur, le jeton était simplement perdu et l'utilisateur qui venait de
 * valider son adresse retombait sur la page de connexion.
 */
export default function HashSession({ next }: { next: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const target = safeNextPath(next, window.location.origin);

    // Lien expiré ou déjà utilisé : Supabase décrit l'échec dans le fragment.
    const errorCode = params.get("error_code") ?? params.get("error");
    if (errorCode) {
      window.location.replace(
        `/login?error=${errorCode === "otp_expired" ? "lien_expire" : "auth"}`,
      );
      return;
    }

    if (!accessToken || !refreshToken) {
      setFailed(true);
      return;
    }

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setFailed(true);
          return;
        }
        // Rechargement complet plutôt que navigation interne : le serveur doit
        // relire les cookies de session tout juste écrits.
        window.location.replace(target);
      })
      .catch(() => setFailed(true));
  }, [next]);

  if (failed) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="glass-card-strong flex w-full max-w-sm flex-col gap-3 px-6 py-8 text-center">
          <h1 className="text-lg font-semibold text-text-primary">
            Lien de connexion invalide
          </h1>
          <p className="text-sm text-text-secondary">
            Ce lien a peut-être déjà servi ou expiré. Reconnecte-toi pour en recevoir un
            nouveau.
          </p>
          <a
            href="/login"
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Retour à la connexion
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <p className="text-sm text-text-secondary">Connexion en cours…</p>
    </main>
  );
}
