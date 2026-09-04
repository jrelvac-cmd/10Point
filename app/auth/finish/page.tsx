export const dynamic = "force-dynamic";

import HashSession from "./HashSession";

/**
 * Dernière étape des liens d'email dont la session arrive dans le fragment
 * d'URL. La route /auth/callback redirige ici ; le composant client lit le
 * fragment et ouvre la session via l'API serveur.
 */
export default async function AuthFinishPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  return <HashSession next={next ?? "/home"} />;
}
