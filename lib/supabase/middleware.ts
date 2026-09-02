import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/u/",
  "/legal",
  "/api/webhooks",
  "/api/demo-login",
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
