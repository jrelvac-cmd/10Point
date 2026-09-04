import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="glass-card-strong flex w-full max-w-sm flex-col items-center gap-4 px-6 py-8 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-accent-dark">404</p>
      <h1 className="text-2xl font-bold text-text-primary">Cette page n&apos;existe pas</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        Le lien est peut-être erroné, ou la collection que tu cherches n&apos;est pas
        partagée publiquement.
      </p>
      <Link
        href="/"
        className="mt-2 btn-primary"
      >
        Retour à l&apos;accueil
      </Link>
      </div>
    </main>
  );
}
