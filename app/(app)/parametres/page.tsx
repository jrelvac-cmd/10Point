export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function ParametresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, plan")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-4 py-4">
      <h1 className="text-xl font-semibold text-text-primary">Paramètres</h1>
      <div className="glass-card flex flex-col gap-3 px-6 py-6">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Nom d&apos;utilisateur</span>
          <span className="text-text-primary">{profile?.username ?? "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Plan actuel</span>
          <span className="text-text-primary capitalize">{profile?.plan ?? "free"}</span>
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}
