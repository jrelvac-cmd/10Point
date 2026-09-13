import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkoutUrlFor, PAID_PLANS, type PaidPlanKey } from "@/lib/lemonsqueezy";
import { APP_URL } from "@/lib/constants";

/**
 * Redirige vers le paiement hébergé Lemon Squeezy. L'identifiant du compte et
 * l'offre choisie partent en données personnalisées, que chaque webhook nous
 * renvoie : c'est ainsi que le bon profil est crédité. L'e-mail pré-rempli sert
 * de secours si elles manquent.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const origin = APP_URL;
  const key = searchParams.get("plan") as PaidPlanKey | null;

  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/pricing`);
  }
  if (!key || !(key in PAID_PLANS)) {
    return NextResponse.redirect(`${origin}/pricing?error=plan_inconnu`);
  }

  const base = checkoutUrlFor(key);
  if (!base) {
    return NextResponse.redirect(`${origin}/pricing?error=paiement_indisponible`);
  }

  const url = new URL(base);
  url.searchParams.set("checkout[custom][supabase_user_id]", user.id);
  url.searchParams.set("checkout[custom][plan]", key);
  if (user.email) url.searchParams.set("checkout[email]", user.email);

  return NextResponse.redirect(url.toString());
}
