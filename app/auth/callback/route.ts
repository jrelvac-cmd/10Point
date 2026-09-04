import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * N'accepte qu'un chemin interne. Sans ce contrôle, un lien de connexion
 * forgé (`next=@site-pirate.com`) renverrait l'utilisateur, fraîchement
 * connecté et confiant, vers un site tiers.
 */
function safeNextPath(raw: string | null, origin: string): string {
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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
