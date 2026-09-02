import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkoutUrlFor, PAID_PLANS, type PaidPlanKey } from "@/lib/whop";
import { APP_URL } from "@/lib/constants";

/**
 * Redirige vers le paiement hébergé Whop. L'identifiant du compte est transmis
 * en métadonnée pour que le webhook sache quel profil créditer ; l'e-mail sert
 * de secours si le checkout ne les relaie pas.
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
  url.searchParams.set("metadata[supabase_user_id]", user.id);
  if (user.email) url.searchParams.set("email", user.email);
  url.searchParams.set("redirect_url", `${APP_URL}/parametres?paiement=ok`);

  return NextResponse.redirect(url.toString());
}
