export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicCollection } from "@/lib/collection";
import { formatEur } from "@/lib/pricing";
import { APP_NAME } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `Collection de ${username} · ${APP_NAME}`,
    // Une collection partagée reste une page personnelle : on évite qu'elle
    // remonte dans les moteurs de recherche.
    robots: { index: false, follow: false },
  };
}

export default async function PublicCollectionPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  // Un visiteur anonyme ne peut pas lire la table profiles (RLS). Cette page
  // étant rendue côté serveur, on interroge la base avec le client
  // service-role en ne sélectionnant que les trois champs nécessaires.
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, share_collection")
    .eq("username", username)
    .maybeSingle();

  // Un profil non partagé se comporte comme inexistant : on ne révèle pas
  // qu'un compte porte ce nom.
  if (!profile || !profile.share_collection) notFound();

  const entries = await getPublicCollection(admin, profile.id);
  const total = entries.reduce((sum, e) => sum + (e.lineValue ?? 0), 0);
  const cardCount = entries.reduce((sum, e) => sum + e.quantity, 0);

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Image src="/icons/icon.svg" alt="" width={24} height={24} className="h-6 w-6" />
            <span className="text-sm font-extrabold tracking-tight text-text-primary">{APP_NAME}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
            Collection de {profile.username}
          </h1>
        </header>

        <section className="glass-card-strong flex flex-col items-center gap-1 px-6 py-6">
          <span className="text-[11px] uppercase tracking-wide text-text-secondary">
            Valeur totale
          </span>
          <span className="text-[32px] font-extrabold tracking-tight text-text-primary">{formatEur(total)}</span>
          <span className="text-xs text-text-muted">
            {cardCount} carte{cardCount > 1 ? "s" : ""}
          </span>
        </section>

        {entries.length === 0 ? (
          <p className="glass-card px-6 py-10 text-center text-sm text-text-secondary">
            Cette collection est encore vide.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id} className="glass-card flex items-center gap-3 p-3">
                {entry.card.imageSmall && (
                  <Image
                    src={entry.card.imageSmall}
                    alt={entry.card.name}
                    width={60}
                    height={84}
                    className="w-12 shrink-0 rounded"
                    unoptimized
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">{entry.card.name}</p>
                  <p className="truncate text-xs text-text-muted">
                    {entry.card.setName}
                    {entry.card.number ? ` · ${entry.card.number}` : ""}
                    {entry.card.setPrintedTotal ? `/${entry.card.setPrintedTotal}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-semibold text-sm text-text-primary">
                    {formatEur(entry.lineValue)}
                  </span>
                  {entry.quantity > 1 && (
                    <span className="font-semibold text-[11px] text-text-muted">
                      ×{entry.quantity}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/"
          className="btn-primary"
        >
          Découvrir ce que vaut ta propre collection
        </Link>
      </div>
    </main>
  );
}
