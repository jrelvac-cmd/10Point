/**
 * N'accepte qu'un chemin interne. Sans ce contrôle, un lien de connexion
 * forgé (`next=@site-pirate.com`) renverrait l'utilisateur, fraîchement
 * connecté et confiant, vers un site tiers.
 */
export function safeNextPath(raw: string | null | undefined, origin: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/home";
  }
  try {
    const target = new URL(raw, origin);
    if (target.origin !== origin) return "/home";
    return target.pathname + target.search;
  } catch {
    return "/home";
  }
}

/**
 * Origine publique de la requête, telle que le navigateur la voit.
 *
 * `request.url` reflète l'adresse d'écoute du serveur (0.0.0.0 en local,
 * hôte interne derrière un proxy), pas celle tapée par l'utilisateur. Les
 * en-têtes Host et X-Forwarded-* portent la bonne valeur.
 */
export function requestOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
