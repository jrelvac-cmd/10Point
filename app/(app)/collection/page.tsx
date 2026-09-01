export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getCollection } from "@/lib/collection";
import { CollectionClient } from "@/components/collection/CollectionClient";
import { collectionLimitFor, type Plan } from "@/lib/plans";

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user!.id)
    .maybeSingle();

  const plan = (profile?.plan ?? "free") as Plan;
  const all = await getCollection(user!.id);

  // Un Pro repassé en Free garde ses cartes en base : on n'en affiche que les
  // 100 premières et on l'invite à faire le tri plutôt que de supprimer pour lui.
  const limit = collectionLimitFor(plan);
  const entries = limit === null ? all : all.slice(0, limit);
  const hiddenCount = all.length - entries.length;

  const totalValue = entries.reduce((sum, e) => sum + (e.lineValue ?? 0), 0);

  return (
    <CollectionClient
      entries={entries}
      totalValue={totalValue}
      limitReached={hiddenCount > 0}
      hiddenCount={hiddenCount}
    />
  );
}
