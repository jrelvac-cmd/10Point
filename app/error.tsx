"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Filet pour toute erreur non gérée dans une page. L'utilisateur voit un
 * message en français et une sortie, jamais une trace technique.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Remonte l'erreur au navigateur (et à Sentry lorsqu'il est configuré).
    console.error(error);
  }, [error]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="glass-card-strong flex w-full max-w-sm flex-col items-center gap-4 px-6 py-8 text-center">
      <h1 className="text-2xl font-bold text-text-primary">Une erreur est survenue</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        Ce n&apos;est pas de ton fait. Réessaie ; si le problème persiste, il est déjà
        remonté de notre côté.
      </p>
      {error.digest && (
        <p className="font-semibold text-[11px] text-text-muted">réf. {error.digest}</p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          onClick={reset}
          className="btn-primary"
        >
          Réessayer
        </button>
        <Link
          href="/home"
          className="btn-secondary"
        >
          Accueil
        </Link>
      </div>
      </div>
    </main>
  );
}
