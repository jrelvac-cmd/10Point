import { createClient } from "@/lib/supabase/server";
import { ScanClient } from "@/components/scan/ScanClient";
import { isPro, scanQuotaFor, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, plan, scans_this_month")
    .eq("id", user!.id)
    .maybeSingle();

  const plan = (profile?.plan ?? "free") as Plan;
  const initials = (profile?.username ?? user!.email ?? "??").slice(0, 2).toUpperCase();

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
