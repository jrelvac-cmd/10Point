export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-redirect";
import { APP_URL } from "@/lib/constants";
import HashSession from "./HashSession";

/**
 * Point de retour de toutes les authentifications externes.
 *
 * Supabase peut rendre la main de trois façons selon le parcours, et les trois
 * doivent aboutir, faute de quoi l'utilisateur retombe sur la page de connexion
 * juste après avoir validé son adresse :
 *  - `?code=…`        : parcours PKCE (Google, inscription initiée ici) ;
 *  - `?token_hash=…`  : lien d'email au format récent ;
 *  - `#access_token=…`: lien d'email au format historique. Le fragment
 *    n'arrivant jamais jusqu'au serveur, il est lu par le navigateur.
 */
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const next = safeNextPath(one("next"), APP_URL);

  // Refus explicite renvoyé par Supabase ou par le fournisseur (accès refusé
  // sur l'écran Google, lien déjà consommé…).
  if (one("error") || one("error_code")) {
    redirect(
      `/login?error=${one("error_code") === "otp_expired" ? "lien_expire" : "auth"}`,
    );
  }

  const code = one("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) redirect("/login?error=auth");
    redirect(next);
  }

  const tokenHash = one("token_hash");
  const type = one("type");
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) redirect("/login?error=lien_expire");
    redirect(next);
  }

  // Ni code ni jeton dans l'URL visible : la session est probablement dans le
  // fragment, que seul le navigateur peut lire.
  return <HashSession next={next} />;
}
