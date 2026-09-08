import Link from "next/link";
import Image from "next/image";
import {
  ScanLine,
  TrendingUp,
  Check,
  Minus,
  Sparkles,
  Share2,
  ShieldCheck,
  Euro,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { FREE_SCANS_PER_MONTH, FREE_COLLECTION_LIMIT } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/marketing/Reveal";
import { HeroShowcase } from "@/components/marketing/HeroShowcase";
import { HeroSearch } from "@/components/marketing/HeroSearch";
import { StepVisual, AxisVisual } from "@/components/marketing/LandingVisuals";
import { Testimonials } from "@/components/marketing/Testimonials";

/**
 * Les promesses de cette page décrivent uniquement ce que l'application fait
 * réellement aujourd'hui. Les fonctions d'analyse et de recommandation
 * viendront plus tard : les annoncer maintenant vaudrait des remboursements et
 * des avis négatifs.
 */
const MARQUEE = [
  "Cotes Cardmarket en euros",
  "Reconnue en quelques secondes",
  "Variation sur 30 jours",
  "Collection partageable par lien",
  "Cartes françaises",
  `${FREE_SCANS_PER_MONTH} scans offerts`,
  "Sans carte bancaire",
];

const STEPS = [
  {
    icon: ScanLine,
    title: "Photographie",
    text: "Ouvre le scan, cadre la carte, appuie. Pas de formulaire, pas de recherche par nom.",
  },
  {
    icon: Sparkles,
    title: "Reconnue en quelques secondes",
    text: "Nom, set, numéro et cote actuelle s'affichent. Un doute ? On te propose les cartes possibles.",
  },
  {
    icon: TrendingUp,
    title: "Suis ce que vaut ta collection",
    text: "La valeur totale, ce qui monte, ce qui baisse, carte par carte, sur 30 jours.",
  },
];

const AXES = [
  {
    icon: Euro,
    kicker: "Le prix qui compte",
    title: "Des cotes Cardmarket, en euros. Pas une estimation en dollars.",
    text: `La plupart des applications donnent un prix américain approximatif. ${APP_NAME} lit la cote du marché européen, celui où tu achètes et où tu vends réellement.`,
    visual: "price",
  },
  {
    icon: TrendingUp,
    kicker: "Ce qui monte, ce qui baisse",
    title: "Sache quand vendre, quand garder, quand racheter.",
    text: "Chaque carte porte sa variation sur 30 jours. Ta collection entière aussi. Tu vois d'un coup d'œil où va ta valeur.",
    visual: "moves",
  },
  {
    icon: Share2,
    kicker: "Ta collection, classée",
    title: "Filtre, trie, et partage-la par un simple lien.",
    text: "Par set, rareté ou variante. Par valeur ou par hausse. Et une page publique en lecture seule, sans ton email, à envoyer à qui tu veux.",
    visual: "share",
  },
] as const;

const FAQ = [
  {
    q: "D'où viennent les prix ?",
    a: "De Cardmarket, la principale place de marché européenne. Les montants sont en euros et reflètent le marché sur lequel tu vends réellement, pas le marché américain.",
  },
  {
    q: "Les cartes japonaises et anglaises sont-elles gérées ?",
    a: `Pas encore. ${APP_NAME} se concentre pour l'instant sur les cartes françaises, afin de les identifier correctement plutôt que d'en couvrir beaucoup approximativement.`,
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
    <main className="page-white flex-1 overflow-x-hidden bg-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icons/icon.svg" alt="" width={36} height={36} className="h-9 w-9" priority />
          <span className="text-base font-extrabold tracking-tight text-text-primary">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary px-4 py-2">
            Se connecter
          </Link>
          <Link href="/login" className="btn-primary hidden px-4 py-2 sm:inline-flex">
            Scanner gratuitement
          </Link>
        </div>
      </header>

      {/* ---------------- Héros ---------------- */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10 lg:pt-10">
        <div className="hero-enter flex min-w-0 flex-col items-start gap-5">
          <h1 className="text-[64px] font-black leading-none tracking-tight text-accent sm:text-[84px] lg:text-[80px] xl:text-[92px]">
            {APP_NAME}
          </h1>
          <p className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Le scanner de cartes Pokémon, en euros.
          </p>
          <p className="max-w-md text-lg leading-relaxed text-text-secondary">
            Scanne tes cartes. Connais leur vraie cote. Suis la valeur de ta collection.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn-primary cta-glow px-7 py-4 text-base">
              Scanner gratuitement <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              aria-label={`Ouvrir ${APP_NAME} sans installation, sur iPhone et Android`}
              className="pressable inline-flex items-center gap-2.5 rounded-xl bg-[#111318] px-4 py-2.5 text-white"
            >
              <Smartphone size={22} />
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-medium text-white/75">Sans installation</span>
                <span className="text-sm font-semibold">iPhone &amp; Android</span>
              </span>
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-text-muted">Une carte en tête ?</p>
            <HeroSearch />
          </div>
          <p className="text-base text-text-secondary">
            <span className="text-lg font-extrabold text-text-primary">{FREE_SCANS_PER_MONTH} scans</span>{" "}
            offerts chaque mois<span className="text-text-muted"> · sans carte bancaire</span>
          </p>
          <div className="flex items-center gap-4">
            <div className="flex" aria-hidden>
              {[18, 48, 268, 200, 340].map((hue, i) => (
                <span
                  key={hue}
                  className={cn("h-11 w-8 rounded-md ring-[3px] ring-white", i > 0 && "-ml-3")}
                  style={{ background: `hsl(${hue} 65% 52%)`, transform: `rotate(${(i - 2) * 4}deg)` }}
                />
              ))}
            </div>
            <p className="text-sm text-text-secondary">
              Toutes les extensions françaises, cotées sur Cardmarket.
            </p>
          </div>
        </div>

        <div className="hero-enter min-w-0 [animation-delay:150ms]">
          <HeroShowcase />
        </div>
      </section>

      {/* ---------------- Bandeau défilant ---------------- */}
      <div className="marquee mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span
              key={i}
              className="glass-card whitespace-nowrap px-4 py-2 text-sm font-semibold text-text-primary"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ---------------- Comment ça marche ---------------- */}
      <section id="comment" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 pb-20">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-text-primary">
            Trois gestes, et tu sais ce que tu as.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 130}>
              <div className="glass-card-strong flex h-full flex-col gap-4 px-5 py-6 transition-transform duration-300 hover:-translate-y-1">
                <StepVisual index={i} />
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
                    <Icon size={16} />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Étape {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Axes marketing ---------------- */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-20">
        {AXES.map(({ icon: Icon, kicker, title, text, visual }, i) => (
          <div
            key={kicker}
            className={cn(
              "grid items-center gap-8 lg:grid-cols-2 lg:gap-16",
              i % 2 === 1 && "lg:[&>*:first-child]:order-2",
            )}
          >
            <Reveal>
              <div className="flex flex-col items-start gap-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-dark">
                  <Icon size={14} /> {kicker}
                </span>
                <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-text-primary lg:text-4xl">
                  {title}
                </h2>
                <p className="text-base text-text-secondary">{text}</p>
                <Link href="/login" className="btn-secondary mt-1">
                  Essayer gratuitement <ArrowRight size={16} />
                </Link>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <AxisVisual kind={visual} />
            </Reveal>
          </div>
        ))}
      </section>

      <Testimonials />

      {/* ---------------- Tarifs ---------------- */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-text-primary">
            Des tarifs simples
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Commence gratuitement. Passe Pro quand ta collection grandit.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 120}>
              <div
                className={cn(
                  "flex h-full flex-col gap-3 px-5 py-6 transition-transform duration-300 hover:-translate-y-1",
                  plan.highlight ? "glass-card-strong ring-2 ring-accent/60" : "glass-card",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">{plan.name}</span>
                  {plan.highlight && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent-dark">
                      Le plus avantageux
                    </span>
                  )}
                </div>
                <p className="text-3xl font-extrabold tracking-tight text-text-primary">
                  {plan.price}
                  <span className="text-sm font-medium text-text-muted">{plan.period}</span>
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
                <Link
                  href="/pricing"
                  className={cn("mt-auto", plan.highlight ? "btn-primary" : "btn-secondary")}
                >
                  {plan.name === "Free" ? "Commencer" : "Choisir"}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="glass-card mt-4 px-4 py-3 text-center text-xs text-text-secondary">
          Une formule annuelle à 24,99 € existe aussi.{" "}
          <Link href="/pricing" className="underline">
            Voir le détail des offres
          </Link>
        </p>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-20">
        <Reveal>
          <h2 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-text-primary">
            Questions fréquentes
          </h2>
        </Reveal>
        <div className="flex flex-col gap-2">
          {FAQ.map(({ q, a }, i) => (
            <Reveal key={q} delay={i * 60}>
              <details className="glass-card group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-text-primary">
                  {q}
                  <span className="text-text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-text-secondary">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Dernier appel + pied ---------------- */}
      <footer className="mx-auto mb-10 w-full max-w-5xl px-6">
        <Reveal>
          <div className="glass-card-strong flex flex-col items-center gap-4 px-6 py-10 text-center">
            <ShieldCheck size={28} className="text-accent-dark" />
            <h2 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
              Tes {FREE_SCANS_PER_MONTH} premiers scans sont offerts.
            </h2>
            <p className="max-w-md text-sm text-text-secondary">
              Pas de carte bancaire, pas d&apos;engagement. Scanne ta première carte et vois ce
              qu&apos;elle vaut vraiment.
            </p>
            <Link href="/login" className="btn-primary cta-glow px-7 py-4 text-base">
              Commencer gratuitement <ArrowRight size={18} />
            </Link>
            <nav className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-text-muted">
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
              Prix fournis par Cardmarket. {APP_NAME} n&apos;est affilié ni à Nintendo, ni à The
              Pokémon Company.
            </p>
          </div>
        </Reveal>
      </footer>
    </main>
  );
}

