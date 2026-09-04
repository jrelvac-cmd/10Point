import { APP_NAME } from "@/lib/constants";

export default function MentionsLegalesPage() {
  return (
    <main className="flex-1 px-4 py-10">
      <div className="glass-card-strong mx-auto max-w-2xl px-6 py-8 text-sm leading-relaxed text-text-secondary">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Mentions légales</h1>
      <p>
        {APP_NAME} est édité à titre individuel. Les informations d&apos;identification complètes
        de l&apos;éditeur seront publiées ici dès la formalisation du statut juridique de
        l&apos;activité.
      </p>
      <p className="mt-4">
        Hébergement : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
      </p>
      <p className="mt-4">
        Contact : voir la page{" "}
        <a href="/legal/confidentialite" className="text-accent-dark underline">
          confidentialité
        </a>
        .
      </p>
    </div>
    </main>
  );
}
