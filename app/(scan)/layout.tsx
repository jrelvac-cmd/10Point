import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Coque plein écran, sans barre haute ni barre basse : la visée caméra doit
 * occuper toute la hauteur et rien ne doit distraire pendant le cadrage.
 */
export default async function ScanLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <div className="flex h-dvh flex-col px-4 pb-4 pt-4">{children}</div>;
}
