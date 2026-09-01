import { APP_NAME } from "@/lib/constants";

export default function ConfidentialitePage() {
  return (
    <main className="flex-1 px-6 py-12 max-w-2xl mx-auto text-text-secondary text-sm leading-relaxed">
      <h1 className="text-xl font-semibold text-text-primary mb-4">
        Politique de confidentialité
      </h1>
      <p>
        {APP_NAME} collecte les données nécessaires au fonctionnement du service : e-mail,
        nom d&apos;utilisateur, contenu de ta collection de cartes. Les photos prises pour
        l&apos;identification d&apos;une carte ne sont jamais conservées : elles sont traitées puis
        supprimées immédiatement après analyse.
      </p>
      <p className="mt-4">
        Les données sont hébergées au sein de l&apos;Union européenne (Supabase, région
        Francfort). Le paiement est traité par Whop, qui ne partage avec nous que les
        informations nécessaires à l&apos;activation de ton abonnement.
      </p>
      <p className="mt-4">
        Conformément au RGPD, tu peux demander la suppression de ton compte et de tes données
        depuis la page Paramètres.
      </p>
    </main>
  );
}
