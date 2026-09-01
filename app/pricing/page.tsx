const PLANS = [
  { name: "Free", price: "0 €", period: "", features: ["20 scans/mois", "Collection 100 cartes"] },
  { name: "Pro Mensuel", price: "3,99 €", period: "/mois", features: ["Scans illimités", "Collection illimitée", "Bulk scan", "Notifications"] },
  { name: "Pro Annuel", price: "24,99 €", period: "/an", features: ["Tout Pro", "7 jours d'essai gratuit"] },
  { name: "Lifetime", price: "59,99 €", period: " une fois", features: ["Tout Pro à vie", "Paiement unique"] },
];

export default function PricingPage() {
  return (
    <main className="flex-1 flex flex-col items-center gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold text-text-primary">Choisis ton plan</h1>
      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div key={plan.name} className="glass-card flex flex-col gap-3 px-5 py-6">
            <span className="text-sm font-medium text-text-secondary">{plan.name}</span>
            <span className="font-mono text-2xl text-text-primary">
              {plan.price}
              <span className="text-sm text-text-muted">{plan.period}</span>
            </span>
            <ul className="flex flex-col gap-1 text-sm text-text-secondary">
              {plan.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
