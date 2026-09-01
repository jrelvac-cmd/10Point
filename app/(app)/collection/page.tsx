export const dynamic = "force-dynamic";

export default function CollectionPage() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <h1 className="text-xl font-semibold text-text-primary">Ma collection</h1>
      <div className="glass-card flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-text-secondary">Aucune carte pour le moment.</p>
        <p className="text-sm text-text-muted">Utilise le bouton scan pour ajouter tes premières cartes.</p>
      </div>
    </div>
  );
}
