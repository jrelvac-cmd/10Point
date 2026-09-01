import { createClient } from "@/lib/supabase/server";
import { ScanClient } from "@/components/scan/ScanClient";
import { isPro, remainingScans, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, scans_this_month")
    .eq("id", user!.id)
    .maybeSingle();

  const plan = (profile?.plan ?? "free") as Plan;

  return (
    <ScanClient
      isPro={isPro(plan)}
      remainingScans={remainingScans(plan, profile?.scans_this_month ?? 0)}
    />
  );
}
