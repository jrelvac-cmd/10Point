import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin, safeNextPath } from "@/lib/auth-redirect";

/**
 * Point de retour de toutes les authentifications externes.
 *
 * C'est volontairement une route et non une page : seuls une route ou une
 * action serveur ont le droit d'écrire des cookies. Dans une page serveur,
 * l'échange du code Google réussissait mais la session n'était jamais
 * enregistrée, et l'utilisateur retombait sur l'écran de connexion.
 *
 * Supabase peut rendre la main de trois façons, toutes gérées :
 *  - `?code=…`        : parcours PKCE (Google, inscription initiée ici) ;
 *  - `?token_hash=…`  : lien d'email au format récent ;
 *  - `#access_token=…`: lien d'email au format historique. Le fragment
 *    n'arrivant jamais jusqu'au serveur, la route renvoie vers une page qui
 *    le lit dans le navigateur ; le navigateur conserve le fragment à travers
 *    la redirection.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = requestOrigin(request);
  const next = safeNextPath(searchParams.get("next"), origin);

  // Refus explicite renvoyé par Supabase ou par le fournisseur (accès refusé
  // sur l'écran Google, lien déjà consommé…).
  if (searchParams.get("error") || searchParams.get("error_code")) {
    const expired = searchParams.get("error_code") === "otp_expired";
    return NextResponse.redirect(`${origin}/login?error=${expired ? "lien_expire" : "auth"}`);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error(`[auth] échange du code refusé : ${error.code ?? "?"} ${error.message}`);
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) return NextResponse.redirect(`${origin}/login?error=lien_expire`);
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Ni code ni jeton visible : la session est dans le fragment.
  const finish = new URL("/auth/finish", origin);
  if (next !== "/home") finish.searchParams.set("next", next);
  return NextResponse.redirect(finish.toString());
}
