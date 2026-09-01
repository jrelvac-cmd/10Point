import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold text-text-primary max-w-xl">
        Fais gagner de l&apos;argent à ta collection Pokémon.
      </h1>
      <p className="text-text-secondary max-w-md">
        {APP_NAME} scanne tes cartes, suit le marché en temps réel et te dit
        exactement quoi vendre, quoi garder, quoi surveiller.
      </p>
      <Link
        href="/login"
        className="glass-card-strong px-6 py-3 font-medium text-text-primary hover:bg-white/20 transition-colors"
      >
        Scanner ma collection — gratuit
      </Link>
      <p className="text-xs text-text-muted">
        20 scans offerts. Sans carte bancaire.
      </p>
    </main>
  );
}
