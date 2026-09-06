import { getSessionUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { ScanClient } from "@/components/scan/ScanClient";
import { isPro, scanQuotaFor } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const user = (await getSessionUser())!;
  const profile = await getProfile(user.id);

  const plan = profile?.plan ?? "free";
  const initials = (profile?.username ?? user.email ?? "??").slice(0, 2).toUpperCase();

  return (
    <ScanClient
      isPro={isPro(plan)}
      plan={plan}
      initials={initials}
      quota={scanQuotaFor(plan)}
      scansThisMonth={profile?.scans_this_month ?? 0}
    />
  );
}
