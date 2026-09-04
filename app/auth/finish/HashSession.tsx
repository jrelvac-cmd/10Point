"use client";

import { useEffect, useState } from "react";
import { safeNextPath } from "@/lib/auth-redirect";

/**
 * Récupère la session quand Supabase la renvoie dans le fragment d'URL
 * (`#access_token=…`), ce qu'il fait pour les liens de confirmation d'email.
 *
 * Un fragment n'est jamais transmis au serveur : sans ce composant, le jeton
 * était perdu et l'utilisateur qui venait de valider son adresse retombait sur
 * la page de connexion. Les jetons sont transmis à une route serveur qui écrit
 * les cookies de session, plutôt qu'au client navigateur : celui-ci fonctionne
 * en parcours PKCE et rejette ce format de jetons.
 */
export default function HashSession({ next }: { next: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Lu tout de suite : certaines bibliothèques effacent le fragment au
    // chargement de la page.
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

    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
    })
      .then((res) => {
        if (!res.ok) {
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
            className="btn-primary"
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
