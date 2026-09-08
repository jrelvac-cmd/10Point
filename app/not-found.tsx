import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen w-full flex-1 items-center justify-center overflow-hidden px-6 py-12">
      <div className="glass-card-strong flex w-full max-w-sm flex-col items-center gap-6 px-6 py-10 text-center">
        <div className="flex flex-col items-center gap-2">
          <p
            className="text-9xl font-extrabold leading-none tracking-tight text-accent-dark"
            style={{ maskImage: "linear-gradient(to bottom, #000 60%, transparent)" }}
          >
            404
          </p>
          <h1 className="-mt-4 text-lg font-bold text-text-primary">
            Cette page n&apos;existe pas
          </h1>
          <p className="max-w-xs text-sm text-text-secondary">
            Le lien est peut-être erroné, ou la collection que tu cherches n&apos;est
            pas partagée publiquement.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className="btn-primary">
            <Home size={16} />
            Retour à l&apos;accueil
          </Link>
          <Link href="/pricing" className="btn-secondary">
            <Compass size={16} />
            Découvrir MintCard
          </Link>
        </div>
      </div>
    </main>
  );
}
