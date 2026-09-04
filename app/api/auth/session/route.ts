import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/constants";

/**
 * Ouvre la session à partir des jetons que Supabase renvoie dans le fragment
 * d'URL des liens de confirmation d'email.
 *
 * Pourquoi côté serveur : le client navigateur est configuré en parcours PKCE
 * et refuse ces jetons d'un autre format, ce qui laissait l'utilisateur devant
 * un écran d'échec juste après avoir validé son adresse. Le client serveur, lui,
 * les valide auprès de Supabase et écrit les cookies de session par le même
 * chemin que le reste de l'application.
 *
 * Les jetons sont la preuve d'identité elle-même : qui les détient est déjà
 * authentifié, la route n'ouvre donc aucun accès nouveau. Le contrôle d'origine
 * empêche en revanche un site tiers de forcer la session d'un compte qu'il
 * contrôle dans le navigateur d'un visiteur.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== APP_URL && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "BAD_ORIGIN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const accessToken = typeof body?.access_token === "string" ? body.access_token : null;
  const refreshToken = typeof body?.refresh_token === "string" ? body.refresh_token : null;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "MISSING_TOKENS" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error(`[auth] session refusée : ${error.code ?? "?"} ${error.message}`);
    // Le code de refus est renvoyé au client : il ne révèle rien de secret et
    // c'est la seule façon de distinguer un lien périmé d'une vraie panne
    // depuis le navigateur.
    return NextResponse.json(
      { error: "INVALID_TOKENS", code: error.code ?? null, detail: error.message },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
