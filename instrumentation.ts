import * as Sentry from "@sentry/nextjs";

/**
 * Point d'entrée Sentry côté serveur. Sans DSN configuré, Sentry reste
 * totalement inactif : l'application fonctionne à l'identique.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
