export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <h1 className="text-xl font-semibold text-text-primary">Scanner une carte</h1>
      <div className="glass-card flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-text-secondary">Le scan arrive bientôt.</p>
      </div>
    </div>
  );
}
