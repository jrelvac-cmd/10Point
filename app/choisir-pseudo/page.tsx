export const dynamic = "force-dynamic";

import { UsernameForm } from "./UsernameForm";

export default function ChoisirPseudoPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="glass-card-strong flex w-full max-w-sm flex-col gap-4 px-6 py-8">
        <h1 className="text-center text-2xl font-bold text-text-primary">
          Choisis ton nom d&apos;utilisateur
        </h1>
        <p className="text-center text-sm text-text-secondary">
          Il servira pour ton lien de collection partageable.
        </p>
        <UsernameForm />
      </div>
    </main>
  );
}
