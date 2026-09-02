import Link from "next/link";
import {
  ScanLine,
  Coins,
  TrendingUp,
  Library,
  Check,
  Minus,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { FREE_SCANS_PER_MONTH, FREE_COLLECTION_LIMIT } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * Les promesses de cette page décrivent uniquement ce que l'application fait
 * réellement aujourd'hui. Les fonctions d'analyse et de recommandation
 * viendront plus tard : les annoncer maintenant vaudrait des remboursements et
 * des avis négatifs.
 */
const FEATURES = [
  {
    icon: ScanLine,
    title: "Scanne, c'est identifié",
    text: "Photographie une carte : nom, set et numéro sont reconnus en quelques secondes.",
  },
  {
    icon: Coins,
    title: "Le vrai prix, en euros",
    text: "Les cotes viennent de Cardmarket, le marché européen où s'achètent et se vendent réellement les cartes.",
  },
  {
    icon: TrendingUp,
    title: "Ce qui monte, ce qui baisse",
    text: "La valeur totale de ta collection et son évolution sur 30 jours, carte par carte.",
  },
  {
    icon: Library,
    title: "Ta collection classée",
    text: "Filtre par set, rareté ou variante, trie par valeur, et partage-la par un simple lien.",
  },
];

const FAQ = [
  {
    q: "D'où viennent les prix ?",
    a: "De Cardmarket, la principale place de marché européenne. Les montants sont en euros et reflètent le marché sur lequel tu vends réellement, pas le marché américain.",
  },
  {
    q: "Les cartes japonaises et anglaises sont-elles gérées ?",
    a: "Pas encore. TenPoint se concentre pour l'instant sur les cartes françaises, afin de les identifier correctement plutôt que d'en couvrir beaucoup approximativement.",
  },
  {
    q: "Et si une carte est mal reconnue ?",
    a: "Quand un doute subsiste, l'application te propose les cartes possibles et te laisse choisir. Un scan qui n'aboutit pas n'est jamais décompté de ton quota.",
  },
  {
    q: "Les cartes gradées PSA ou CGC ?",
    a: "Les prix affichés correspondent à des cartes brutes, non gradées. La cote des cartes gradées viendra dans une prochaine version.",
  },
  {
    q: "Puis-je annuler mon abonnement ?",
    a: "Oui, en un clic depuis tes paramètres, sans avoir à écrire à qui que ce soit. Les formules mensuelle et annuelle démarrent par 7 jours d'essai gratuit.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "0 €",
    period: "",
    lines: [
      { label: `${FREE_SCANS_PER_MONTH} scans par mois`, ok: true },
      { label: `${FREE_COLLECTION_LIMIT} cartes maximum`, ok: true },
      { label: "Scan en rafale", ok: false },
    ],
  },
  {
    name: "Pro",
    price: "3,99 €",
    period: "/mois",
    lines: [
      { label: "Scans illimités", ok: true },
      { label: "Collection illimitée", ok: true },
      { label: "Scan en rafale", ok: true },
    ],
  },
  {
    name: "Lifetime",
    price: "59,99 €",
    period: " une fois",
    highlight: true,
    lines: [
      { label: "Tout le Pro, à vie", ok: true },
      { label: "Un seul paiement", ok: true },
      { label: "Pas d'abonnement", ok: true },
    ],
  },
];

export default function LandingPage() {
  return (
    <main className="flex-1">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold tracking-wide text-accent">
          {APP_NAME.toUpperCase()}
        </span>
        <Link
          href="/login"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          Se connecter
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold leading-tight text-text-primary sm:text-5xl">
          Ta collection Pokémon vaut peut-être plus que tu ne crois.
        </h1>
        <p className="max-w-xl text-text-secondary">
          Scanne tes cartes, obtiens leur cote réelle en euros et suis la valeur
          de ta collection au fil du marché.
        </p>
        <Link
          href="/login"
          className="rounded-2xl bg-accent px-7 py-4 font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Scanner ma collection — gratuit
        </Link>
        <p className="text-xs text-text-muted">
          {FREE_SCANS_PER_MONTH} scans offerts. Sans carte bancaire.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-6 pb-16 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass-card flex flex-col gap-2 px-5 py-6">
            <Icon size={22} className="text-accent-light" />
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            <p className="text-sm text-text-secondary">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16 text-center">
        <p className="glass-card-strong px-6 py-8 text-lg text-text-primary">
          La plupart des applications te donnent un prix approximatif, souvent en
          dollars.{" "}
          <span className="text-accent-light">
            TenPoint te donne la cote européenne, celle qui compte quand tu vends.
          </span>
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-16">
        <h2 className="mb-5 text-center text-xl font-semibold text-text-primary">
          Des tarifs simples
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col gap-3 px-5 py-6",
                plan.highlight
                  ? "glass-card-strong ring-1 ring-accent/50"
                  : "glass-card",
              )}
            >
              <span className="text-sm font-medium text-text-secondary">
                {plan.name}
              </span>
              <p className="font-mono text-2xl text-text-primary">
                {plan.price}
                <span className="text-sm text-text-muted">{plan.period}</span>
              </p>
              <ul className="flex flex-col gap-1.5">
                {plan.lines.map((l) => (
                  <li
                    key={l.label}
                    className={cn(
                      "flex items-center gap-2 text-xs",
                      l.ok ? "text-text-secondary" : "text-text-muted",
                    )}
                  >
                    {l.ok ? (
                      <Check size={12} className="shrink-0 text-up" />
                    ) : (
                      <Minus size={12} className="shrink-0" />
                    )}
                    {l.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-text-muted">
          Une formule annuelle à 24,99 € existe aussi.{" "}
          <Link href="/pricing" className="underline">
            Voir le détail des offres
          </Link>
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <h2 className="mb-5 text-center text-xl font-semibold text-text-primary">
          Questions fréquentes
        </h2>
        <div className="flex flex-col gap-2">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="glass-card px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium text-text-primary">
                {q}
              </summary>
              <p className="mt-2 text-sm text-text-secondary">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 border-t border-white/10 px-6 py-8 text-center">
        <Link
          href="/login"
          className="rounded-2xl bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Commencer gratuitement
        </Link>
        <nav className="flex flex-wrap justify-center gap-4 text-xs text-text-muted">
          <Link href="/pricing" className="hover:text-text-secondary">
            Tarifs
          </Link>
          <Link href="/legal/mentions" className="hover:text-text-secondary">
            Mentions légales
          </Link>
          <Link href="/legal/cgv" className="hover:text-text-secondary">
            CGV
          </Link>
          <Link href="/legal/confidentialite" className="hover:text-text-secondary">
            Confidentialité
          </Link>
        </nav>
        <p className="text-[11px] text-text-muted">
          Prix fournis par Cardmarket. {APP_NAME} n&apos;est affilié ni à Nintendo,
          ni à The Pokémon Company.
        </p>
      </footer>
    </main>
  );
}
