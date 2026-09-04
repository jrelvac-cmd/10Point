import { timingSafeEqual } from "node:crypto";

/**
 * Authentifie un appel de tâche planifiée.
 *
 * Refuse tout si le secret n'est pas configuré : une variable oubliée sur
 * Vercel ne doit pas ouvrir la route à n'importe qui. La comparaison est à
 * temps constant pour ne pas laisser deviner le secret octet par octet.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
