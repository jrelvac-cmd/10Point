export const dynamic = "force-dynamic";

import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FREE_SCANS_PER_MONTH, FREE_COLLECTION_LIMIT } from "@/lib/plans";
import { cn } from "@/lib/utils";

type PricingPlan = {
  key: "monthly" | "yearly" | "lifetime" | null;
  name: string;
  price: string;
  period: string;
  trial?: string;
  note?: string;
  highlight?: boolean;
  features: { label: string; included: boolean }[];
};

const PLANS: PricingPlan[] = [
  {
    key: null,
    name: "Free",
    price: "0 €",
    period: "",
    features: [
      { label: `${FREE_SCANS_PER_MONTH} scans par mois`, included: true },
      { label: `Collection jusqu'à ${FREE_COLLECTION_LIMIT} cartes`, included: true },
      { label: "Scan en rafale", included: false },
      { label: "Alertes de prix", included: false },
    ],
  },
  {
    key: "monthly",
    name: "Pro Mensuel",
    price: "3,99 €",
    period: "/mois",
    trial: "7 jours d'essai gratuit",
    features: [
      { label: "Scans illimités", included: true },
      { label: "Collection illimitée", included: true },
      { label: "Scan en rafale", included: true },
      { label: "Alertes de prix", included: true },
    ],
  },
  {
    key: "yearly",
    name: "Pro Annuel",
    price: "24,99 €",
    period: "/an",
    trial: "7 jours d'essai gratuit",
    note: "Deux mois offerts par rapport au mensuel",
    features: [
      { label: "Scans illimités", included: true },
      { label: "Collection illimitée", included: true },
      { label: "Scan en rafale", included: true },
      { label: "Alertes de prix", included: true },
    ],
  },
  {
    key: "lifetime",
    name: "Lifetime",
    price: "59,99 €",
    period: " une fois",
    highlight: true,
    note: "Paye une fois, garde l'accès à vie",
    features: [
      { label: "Scans illimités", included: true },
      { label: "Collection illimitée", included: true },
      { label: "Scan en rafale", included: true },
      { label: "Alertes de prix", included: true },
    ],
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex-1 flex flex-col items-center gap-8 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text-primary">Choisis ton plan</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Annulable en un clic, sans condition.
        </p>
      </div>

      {error === "paiement_indisponible" && (
        <p className="glass-card border-l-2 border-l-warn px-4 py-3 text-sm text-text-primary">
          Le paiement n&apos;est pas encore activé. Réessaie dans quelques instants.
        </p>
      )}

      <div className="grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "flex flex-col gap-4 px-5 py-6",
              plan.highlight
                ? "glass-card-strong ring-1 ring-accent/50"
                : "glass-card",
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-secondary">
                  {plan.name}
                </span>
                {plan.highlight && (
                  <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px] text-accent-light">
                    Le plus avantageux
                  </span>
                )}
              </div>
              <p className="mt-2 font-mono text-2xl text-text-primary">
                {plan.price}
                <span className="text-sm text-text-muted">{plan.period}</span>
              </p>
              {plan.trial && (
                <p className="mt-1 text-[11px] text-up">{plan.trial}</p>
              )}
              {plan.note && (
                <p className="mt-1 text-[11px] text-text-muted">{plan.note}</p>
              )}
            </div>

            <ul className="flex flex-1 flex-col gap-2">
              {plan.features.map((f) => (
                <li
                  key={f.label}
                  className={cn(
                    "flex items-start gap-2 text-xs",
                    f.included ? "text-text-secondary" : "text-text-muted",
                  )}
                >
                  {f.included ? (
                    <Check size={13} className="mt-0.5 shrink-0 text-up" />
                  ) : (
                    <Minus size={13} className="mt-0.5 shrink-0" />
                  )}
                  {f.label}
                </li>
              ))}
            </ul>

            {plan.key ? (
              <Link
                href={user ? `/api/checkout?plan=${plan.key}` : "/login?next=/pricing"}
                prefetch={false}
                className={cn(
                  "rounded-2xl px-4 py-3 text-center text-sm font-medium transition-colors",
                  plan.highlight
                    ? "bg-accent text-white hover:bg-accent-dark"
                    : "border border-glass-border text-text-primary hover:bg-white/10",
                )}
              >
                Choisir
              </Link>
            ) : (
              <span className="rounded-2xl border border-glass-border px-4 py-3 text-center text-sm text-text-muted">
                Plan actuel par défaut
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="max-w-lg text-center text-[11px] text-text-muted">
        Paiement sécurisé par Whop. Les abonnements se renouvellent
        automatiquement et peuvent être annulés à tout moment depuis tes
        paramètres. Voir les{" "}
        <Link href="/legal/cgv" className="underline">
          conditions générales de vente
        </Link>
        .
      </p>
    </main>
  );
}
