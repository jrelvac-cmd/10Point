export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { getCollection } from "@/lib/collection";
import { CollectionClient } from "@/components/collection/CollectionClient";
import { collectionLimitFor } from "@/lib/plans";

export default async function CollectionPage() {
  const user = (await getSessionUser())!;
  const [profile, all] = await Promise.all([getProfile(user.id), getCollection(user.id)]);

  // Un Pro repassé en Free garde ses cartes en base : on n'en affiche que les
  // 100 premières et on l'invite à faire le tri plutôt que de supprimer pour lui.
  const limit = collectionLimitFor(profile?.plan ?? "free");
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
