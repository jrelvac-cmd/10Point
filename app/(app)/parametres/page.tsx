export const dynamic = "force-dynamic";

import Link from "next/link";
import { after } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { InstallTourButton } from "@/components/onboarding/InstallTourButton";
import { reconcileSubscription } from "@/lib/subscription";
import { isPro, remainingScans, type Plan } from "@/lib/plans";
import { APP_URL } from "@/lib/constants";

const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  lifetime: "Lifetime",
};

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { paiement } = await searchParams;
  const user = (await getSessionUser())!;
  const profile = await getProfile(user.id);

  const known = {
    plan: profile?.plan ?? "free",
    planExpiresAt: profile?.plan_expires_at ?? null,
    whopMembershipId: profile?.whop_membership_id ?? null,
  };

  // Filet si un webhook Whop s'est perdu : on relit l'état réel de l'abonnement.
  // L'appel à Whop est lent ; on ne l'attend que lorsqu'il peut changer ce qui
  // s'affiche tout de suite (retour de paiement, échéance dépassée). Sinon il
  // part après l'envoi de la page et corrige la base pour la visite suivante.
  const expired = known.planExpiresAt !== null && new Date(known.planExpiresAt) <= new Date();
  const mustWait = paiement === "ok" || expired;
  const subscription = mustWait
    ? await reconcileSubscription(user.id, known)
    : known;
  if (!mustWait && known.whopMembershipId) {
    after(() => reconcileSubscription(user.id, known).catch(() => undefined));
  }

  const plan = subscription.plan;
  const left = remainingScans(plan, profile?.scans_this_month ?? 0);

  return (
    <div className="stagger flex flex-col gap-4 py-4">
      <h1 className="text-2xl font-bold text-text-primary">Paramètres</h1>

      {paiement === "ok" && (
        <p className="glass-card border-l-2 border-l-up px-4 py-3 text-sm text-text-primary">
          Paiement enregistré. Si ton plan n&apos;apparaît pas encore, recharge la
          page dans quelques secondes.
        </p>
      )}

      <section className="glass-card flex flex-col gap-3 px-5 py-5">
        <h2 className="text-sm font-bold text-text-primary">Compte</h2>
        <Row label="Nom d'utilisateur" value={profile?.username ?? "—"} />
        <Row label="Email" value={user?.email ?? "—"} />
      </section>

      <section className="glass-card flex flex-col gap-3 px-5 py-5">
        <h2 className="text-sm font-bold text-text-primary">Abonnement</h2>
        <Row label="Plan actuel" value={PLAN_LABEL[plan]} />
        {left !== null && <Row label="Scans restants ce mois" value={String(left)} />}
        {subscription.planExpiresAt && (
          <Row
            label="Prochain renouvellement"
            value={new Date(subscription.planExpiresAt).toLocaleDateString("fr-FR")}
          />
        )}

        {isPro(plan) ? (
          <a
            href="https://whop.com/orders"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary mt-1"
          >
            Gérer ou annuler mon abonnement
          </a>
        ) : (
          <Link
            href="/pricing"
            className="mt-1 btn-primary"
          >
            Passer Pro
          </Link>
        )}
      </section>

      <section className="glass-card flex flex-col gap-3 px-5 py-5">
        <h2 className="text-sm font-bold text-text-primary">Application</h2>
        <InstallTourButton />
      </section>

      <SettingsClient
        shareCollection={profile?.share_collection ?? false}
        notifyPriceChange={profile?.notify_price_change ?? false}
        username={profile?.username ?? ""}
        publicUrl={`${APP_URL}/u/${profile?.username ?? ""}`}
        isPro={isPro(plan)}
      />

      <LogoutButton />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right text-text-primary">{value}</span>
    </div>
  );
}
