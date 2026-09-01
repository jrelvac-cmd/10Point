export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCollection } from "@/lib/collection";
import { computeGauge } from "@/lib/pricing";
import { HeroGauge } from "@/components/home/HeroGauge";
import { TopFiveSwitcher, type TopCard } from "@/components/home/TopFiveSwitcher";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entries = await getCollection(user!.id);

  const gauge = computeGauge(
    entries.map((e) => ({ value: e.lineValue ?? 0, variationPct: e.variationPct })),
  );

  // Variation en euros : différence entre la valeur actuelle et ce que valaient
  // les mêmes cartes il y a 30 jours. Seules les lignes dont on connaît les deux
  // prix entrent dans le calcul, pour ne pas afficher un écart trompeur.
  let valueNow = 0;
  let valueThen = 0;
  for (const e of entries) {
    if (e.lineValue === null || e.variationPct === null) continue;
    const previous = e.lineValue / (1 + e.variationPct / 100);
    valueNow += e.lineValue;
    valueThen += previous;
  }
  const measured = valueThen > 0;
  const variationEur = measured ? Math.round((valueNow - valueThen) * 100) / 100 : null;
  const variationPct = measured
    ? Math.round(((valueNow - valueThen) / valueThen) * 1000) / 10
    : null;

  const toTopCard = (e: (typeof entries)[number]): TopCard => ({
    id: e.id,
    name: e.card.name,
    setName: e.card.setName,
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

  if (!entries.length) {
    return (
      <div className="flex flex-col gap-6 py-4">
        <HeroGauge
          up={0}
          down={0}
          stable={0}
          total={0}
          variationEur={null}
          variationPct={null}
        />
        <div className="glass-card flex flex-col items-center gap-3 px-6 py-8 text-center">
          <p className="text-text-secondary">
            Ta collection vaut peut-être plus que tu ne crois.
          </p>
          <Link
            href="/scan"
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Scanner ma première carte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <HeroGauge
        up={gauge.up}
        down={gauge.down}
        stable={gauge.stable}
        total={gauge.total}
        variationEur={variationEur}
        variationPct={variationPct}
      />
      <TopFiveSwitcher byValue={byValue} byRise={byRise} />
    </div>
  );
}
