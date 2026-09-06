import { cache } from "react";
import { createClient } from "./supabase/server";
import { getJwks } from "./supabase/jwks";

export type SessionUser = { id: string; email: string | null };

/**
 * Utilisateur de la requête, vérifié localement.
 *
 * `getUser()` interroge le serveur d'authentification à chaque appel : le
 * layout, la page et le middleware le faisaient chacun de leur côté, soit
 * trois allers-retours réseau par navigation avant d'afficher quoi que ce
 * soit. Le jeton est signé par une clé asymétrique : sa signature se vérifie
 * ici, sans réseau, et le résultat est partagé par tout le rendu.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const keys = await getJwks().catch(() => undefined);
  const { data } = await supabase.auth.getClaims(undefined, keys ? { keys } : undefined);
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
