import { APP_NAME } from "@/lib/constants";

export default function CGVPage() {
  return (
    <main className="flex-1 px-6 py-12 max-w-2xl mx-auto text-text-secondary text-sm leading-relaxed">
      <h1 className="text-xl font-semibold text-text-primary mb-4">
        Conditions générales de vente
      </h1>
      <p>
        {APP_NAME} propose un abonnement Pro (mensuel, annuel) et un accès à vie (Lifetime),
        payables via Whop. Un essai gratuit de 7 jours est proposé sur les abonnements mensuel et
        annuel ; il peut être annulé à tout moment avant son terme sans frais.
      </p>
      <p className="mt-4">
        L&apos;abonnement se renouvelle automatiquement à la fin de chaque période, sauf
        annulation depuis l&apos;espace client Whop. L&apos;offre Lifetime correspond à un
        paiement unique donnant un accès Pro sans limite de durée.
      </p>
      <p className="mt-4">
        Conformément au droit applicable, le droit de rétractation ne s&apos;applique pas une fois
        le service numérique pleinement exécuté avec l&apos;accord exprès du client.
      </p>
    </main>
  );
}
