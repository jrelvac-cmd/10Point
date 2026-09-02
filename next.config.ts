import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.tcgdex.net" },
      // Cartes mises en cache avant la bascule vers TCGdex.
      { protocol: "https", hostname: "images.pokemontcg.io" },
    ],
  },
};

/**
 * Sentry n'intervient au build que pour téléverser les source maps, et
 * seulement si un jeton est fourni. Sans jeton ni DSN, le build et
 * l'exécution sont strictement identiques à une application sans Sentry.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  webpack: { treeshake: { removeDebugLogging: true } },
});
