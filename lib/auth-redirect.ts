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
