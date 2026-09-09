import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopBar } from "@/components/nav/TopBar";
import { InstallTour } from "@/components/onboarding/InstallTour";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  const initials = (profile?.username ?? user.email ?? "??").slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col pb-28">
      <TopBar initials={initials} plan={profile?.plan ?? "free"} />
      <div className="flex-1 px-4">{children}</div>
      <div className="scroll-edge-bottom" aria-hidden />
      <BottomNav />
      <InstallTour />
    </div>
  );
}
