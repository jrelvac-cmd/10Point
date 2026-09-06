import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Un seul client par requête, partagé entre le layout, la page et les
 * bibliothèques qu'ils appellent : `cache` de React mémorise le résultat le
 * temps du rendu. Sans cela, chaque couche recréait son client et relançait
 * ses propres lectures de session.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : ignoré, le middleware
            // rafraîchit déjà la session sur chaque requête.
          }
        },
      },
    },
  );
});
