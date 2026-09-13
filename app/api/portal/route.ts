import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { customerPortalUrl } from "@/lib/lemonsqueezy";
import { APP_URL } from "@/lib/constants";

const FALLBACK_PORTAL = "https://app.lemonsqueezy.com/my-orders";

/** Envoie l'abonné vers son espace client Lemon Squeezy (changer de carte, résilier). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login?next=/parametres`);

  const profile = await getProfile(user.id);
  const url = profile?.ls_subscription_id
    ? await customerPortalUrl(profile.ls_subscription_id)
    : null;

  return NextResponse.redirect(url ?? FALLBACK_PORTAL);
}
