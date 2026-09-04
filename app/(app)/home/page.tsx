export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCollection } from "@/lib/collection";
import { computeCollectionVariation, computeGauge } from "@/lib/pricing";
import type { Plan } from "@/lib/plans";
import { HeroGauge } from "@/components/home/HeroGauge";
import { TopFiveSwitcher, type TopCard } from "@/components/home/TopFiveSwitcher";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [entries, { data: profile }] = await Promise.all([
    getCollection(user!.id),
    supabase.from("profiles").select("plan").eq("id", user!.id).maybeSingle(),
  ]);
  const plan = (profile?.plan ?? "free") as Plan;

  const totalValue = entries.reduce((sum, e) => sum + (e.lineValue ?? 0), 0);
  const cardCount = entries.reduce((sum, e) => sum + e.quantity, 0);

  const gauge = computeGauge(
    entries.map((e) => ({ count: e.quantity, variationPct: e.variationPct })),
  );
  const variation = computeCollectionVariation(entries);

  const toTopCard = (e: (typeof entries)[number]): TopCard => ({
    id: e.id,
    name: e.card.name,
    number: e.card.number,
    setPrintedTotal: e.card.setPrintedTotal,
    imageSmall: e.card.imageSmall,
    lineValue: e.lineValue,
    variationPct: e.variationPct,
  });

  const byValue = [...entries]
    .filter((e) => e.lineValue !== null)
    .sort((a, b) => (b.lineValue ?? 0) - (a.lineValue ?? 0))
    .slice(0, 5)
    .map(toTopCard);

  const byRise = [...entries]
    .filter((e) => e.variationPct !== null)
    .sort((a, b) => (b.variationPct ?? 0) - (a.variationPct ?? 0))
    .slice(0, 5)
    .map(toTopCard);

  return (
    <div className="flex flex-col gap-4 py-2">
      <HeroGauge
        totalValue={totalValue}
        gauge={gauge}
        variation={variation}
        cardCount={cardCount}
        distinctCount={entries.length}
        plan={plan}
      />

      {entries.length ? (
        <TopFiveSwitcher byValue={byValue} byRise={byRise} />
      ) : (
        <div className="glass-card-strong flex flex-col items-center gap-3 px-6 py-8 text-center">
          <p className="text-sm text-text-secondary">
            Ta collection vaut peut-être plus que tu ne crois.
          </p>
          <Link
            href="/scan"
            className="rounded-full bg-[#4F5FE6] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(79,95,230,0.35)] hover:brightness-110"
          >
            Scanner ma première carte
          </Link>
        </div>
      )}
    </div>
  );
}
