export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <section className="glass-card-strong flex flex-col items-center gap-2 px-6 py-8">
        <span className="text-xs uppercase tracking-wide text-text-secondary">
          Valeur collection
        </span>
        <span className="font-mono text-4xl text-text-primary">0,00 €</span>
        <p className="text-sm text-text-muted">
          Scanne ta première carte pour voir ta collection prendre vie ici.
        </p>
      </section>
    </div>
  );
}
