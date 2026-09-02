import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Un échantillon suffit pour la performance ; les erreurs, elles, sont
  // toutes remontées.
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
