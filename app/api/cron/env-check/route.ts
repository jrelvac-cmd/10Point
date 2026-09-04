import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";

/**
 * Diagnostic d'intégrité des variables d'environnement.
 *
 * Une clé recopiée depuis un affichage masqué embarque des puces « • ». Elle
 * paraît correcte dans le tableau de bord, mais tout appel réseau qui la place
 * dans un en-tête HTTP échoue, car un en-tête n'accepte pas de caractère
 * au-delà de 255. Le symptôme est trompeur : la bibliothèque Supabase avale
 * l'erreur et se comporte comme s'il n'y avait pas de session.
 *
 * Aucune valeur n'est renvoyée, seulement de quoi repérer la variable fautive.
 * L'accès est protégé par le secret des tâches planifiées.
 */
const WATCHED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "WHOP_API_KEY",
  "WHOP_WEBHOOK_SECRET",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_NAME",
  "RESEND_API_KEY",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
];

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const report = WATCHED.map((name) => {
    const value = process.env[name];
    if (value === undefined) return { name, etat: "absente" };
    if (value === "") return { name, etat: "vide" };

    let badIndex = -1;
    let badCode = 0;
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code > 255 || code < 32) {
        badIndex = i;
        badCode = code;
        break;
      }
    }

    const espaces = value !== value.trim();

    return {
      name,
      etat: badIndex === -1 && !espaces ? "OK" : "CORROMPUE",
      longueur: value.length,
      ...(badIndex !== -1 ? { premierCaractereInvalide: badIndex, code: badCode } : {}),
      ...(espaces ? { espacesAutour: true } : {}),
    };
  });

  return NextResponse.json({ variables: report });
}
