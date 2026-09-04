"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Dernier filet : ne s'affiche que si le layout racine lui-même plante.
 * Il doit rendre html et body, le layout n'étant plus disponible, d'où les
 * styles en ligne qui reprennent la direction artistique.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #eceef8 0%, #7d86dc 60%, #3a3fa6 100%)",
          color: "#1b1f3b",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.8)",
            borderRadius: 28,
            padding: "32px 28px",
            boxShadow: "0 14px 36px rgba(28,33,96,0.14)",
            maxWidth: 360,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            Une erreur est survenue
          </h1>
          <p style={{ opacity: 0.65, fontSize: 14, marginBottom: 20 }}>
            Elle a été remontée de notre côté. Tu peux réessayer.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#4F5FE6",
              color: "#fff",
              border: 0,
              borderRadius: 999,
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(79,95,230,0.35)",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
