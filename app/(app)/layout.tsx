import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopBar } from "@/components/nav/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const initials = (profile?.username ?? user.email ?? "??").slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopBar initials={initials} />
      <div className="flex-1 px-4">{children}</div>
      <BottomNav />
    </div>
  );
}
