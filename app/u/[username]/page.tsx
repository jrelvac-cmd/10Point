export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PublicCollectionPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, share_collection")
    .eq("username", username)
    .maybeSingle();

  if (!profile || !profile.share_collection) notFound();

  return (
    <main className="flex-1 flex flex-col gap-4 px-6 py-12">
      <h1 className="text-xl font-semibold text-text-primary">
        Collection de {profile.username}
      </h1>
      <div className="glass-card px-6 py-12 text-center text-text-secondary">
        Collection à venir.
      </div>
    </main>
  );
}
