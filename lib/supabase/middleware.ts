import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/u/",
  "/legal",
  // Retour de Google OAuth : le code d'autorisation y est échangé contre une
  // session, il n'y en a donc pas encore au moment de l'appel.
  "/auth/callback",
  // Ouvre la session à partir des jetons d'un lien d'email : par définition,
  // aucune session n'existe encore quand elle est appelée.
  "/api/auth/session",
  "/api/webhooks",
  "/api/demo-login",
  // Ouvert par un lien (navigation, pas fetch) : la route redirige elle-même
  // vers la connexion. Un 401 JSON afficherait une page brute à l'utilisateur.
  "/api/checkout",
  // Appelé par le planificateur de Vercel, jamais par un navigateur connecté :
  // il se protège par son propre secret, pas par une session.
  "/api/cron",
  "/_next",
  "/favicon",
  // Ressources que le navigateur récupère sans session. Un manifeste protégé
  // rendrait l'application non installable.
  "/manifest.webmanifest",
  "/icons/",
  "/robots.txt",
  "/sitemap.xml",
];
const ONBOARDING_PATH = "/choisir-pseudo";
const ONBOARDING_EXEMPT = [ONBOARDING_PATH, "/auth/callback", "/api/"];

function isPublicPath(pathname: string) {
  if (pathname === "/" || pathname === "/pricing") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    // Une route d'API appelée sans session doit répondre 401 en JSON : une
    // redirection vers la page de connexion (du HTML) ferait échouer le client
    // avec un message trompeur au lieu de l'inviter à se reconnecter.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicPath(pathname) && !ONBOARDING_EXEMPT.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username_set")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !profile.username_set) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
