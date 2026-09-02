import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-6xl text-accent-light">404</p>
      <h1 className="text-xl font-semibold text-text-primary">Cette page n&apos;existe pas</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        Le lien est peut-être erroné, ou la collection que tu cherches n&apos;est pas
        partagée publiquement.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-dark"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
