"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Dernier filet : ne s'affiche que si le layout racine lui-même plante.
 * Il doit rendre html et body, le layout n'étant plus disponible.
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
          background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Une erreur est survenue</h1>
          <p style={{ opacity: 0.7, fontSize: 14, marginBottom: 16 }}>
            Elle a été remontée de notre côté. Tu peux réessayer.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#6366F1",
              color: "#fff",
              border: 0,
              borderRadius: 16,
              padding: "12px 20px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
