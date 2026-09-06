import type { JWK } from "@supabase/supabase-js";

const TTL_MS = 10 * 60 * 1000;

let cached: { keys: JWK[]; at: number } | null = null;
let inflight: Promise<JWK[]> | null = null;

/**
 * Clés publiques de signature des jetons, gardées au niveau du module.
 *
 * supabase-js les met en cache par instance de client ; or un client est créé
 * à chaque requête, ce qui refaisait l'appel réseau à chaque page. Ici les
 * clés survivent tant que l'instance serveur reste chaude : la vérification
 * du jeton devient un simple calcul local, sans aller-retour vers Supabase.
 */
export async function getJwks(): Promise<JWK[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.keys;
  if (inflight) return inflight;

  inflight = fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`JWKS_${res.status}`);
      const body = (await res.json()) as { keys: JWK[] };
      cached = { keys: body.keys, at: Date.now() };
      return body.keys;
    })
    .catch((err) => {
      // Sans clés, supabase-js retombe sur sa propre récupération : plus lent,
      // mais jamais bloquant.
      if (cached) return cached.keys;
      throw err;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
