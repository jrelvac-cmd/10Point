import Link from "next/link";
import Image from "next/image";
import {
  ScanLine,
  Coins,
  TrendingUp,
  Library,
  Check,
  Minus,
  Sparkles,
  Share2,
  ShieldCheck,
  Euro,
  ArrowRight,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { FREE_SCANS_PER_MONTH, FREE_COLLECTION_LIMIT } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/marketing/Reveal";
import { HoloCard } from "@/components/marketing/HoloCard";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
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
    text: "La plupart des applications donnent un prix américain approximatif. TenPoint lit la cote du marché européen, celui où tu achètes et où tu vends réellement.",
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
    <main className="flex-1 overflow-x-hidden">
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
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-16 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-14">
        <div className="hero-enter flex flex-col items-start gap-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-accent-dark shadow-inner">
            <Sparkles size={14} /> Scan par photo · cotes Cardmarket en direct
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            Ta collection Pokémon vaut peut-être{" "}
            <span className="bg-gradient-to-r from-accent to-[#7c3aed] bg-clip-text text-transparent">
              plus que tu ne crois.
            </span>
          </h1>
          <p className="max-w-xl text-lg text-text-secondary">
            Photographie une carte, obtiens sa vraie cote en euros, et suis la valeur de
            toute ta collection au fil du marché.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn-primary cta-glow px-7 py-4 text-base">
              Scanner ma collection — gratuit <ArrowRight size={18} />
            </Link>
            <Link href="#comment" className="btn-secondary px-5 py-4">
              Voir comment ça marche
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-secondary">
            {[`${FREE_SCANS_PER_MONTH} scans offerts`, "Sans carte bancaire", "Prix Cardmarket, en €"].map(
              (t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check size={14} className="text-up" /> {t}
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
          <div className="relative mx-auto w-[260px] sm:w-[290px]">
            <HoloCard
              name="Dracaufeu"
              set="Set de Base · 4/102"
              price="533,88 €"
              variation="+6,2 %"
              hue={18}
              tilt={-12}
              className="absolute -left-10 top-8 z-10 w-[120px] sm:-left-32 sm:w-[150px]"
            />
            <HoloCard
              name="Pikachu"
              set="Set de Base · 58/102"
              price="15,45 €"
              variation="+80,5 %"
              hue={48}
              tilt={10}
              delay={1.3}
              className="absolute -right-10 top-24 z-10 w-[110px] sm:-right-32 sm:w-[140px]"
            />
            <HoloCard
              name="Mewtwo"
              set="Set de Base · 10/102"
              price="98,20 €"
              variation="−3,1 %"
              hue={268}
              tilt={16}
              delay={2.4}
              className="absolute -bottom-6 -right-4 z-10 w-[100px] sm:-right-24 sm:w-[125px]"
            />
            <div className="hero-enter [animation-delay:150ms]">
              <PhoneMockup />
            </div>
          </div>
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
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-accent-dark shadow-inner">
                  <Icon size={14} /> {kicker}
                </span>
                <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(28,33,96,0.4)] lg:text-4xl">
                  {title}
                </h2>
                <p className="text-base text-white/85 drop-shadow">{text}</p>
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
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(28,33,96,0.4)]">
            Des tarifs simples
          </h2>
          <p className="mt-2 text-center text-sm text-white/80">
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
          <h2 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(28,33,96,0.4)]">
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

/** Petite scène illustrant chaque étape, animée en boucle. */
function StepVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#2a2f5e] to-[#0f1340]">
        <div className="relative aspect-[63/88] h-[62%]">
          {["left-0 top-0 border-l-4 border-t-4 rounded-tl-lg", "right-0 top-0 border-r-4 border-t-4 rounded-tr-lg", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg"].map((c) => (
            <span key={c} className={cn("absolute h-5 w-5 border-white", c)} />
          ))}
          <div className="absolute inset-2">
            <HoloCard name="Dracaufeu" set="4/102" price="533,88 €" variation="+6,2 %" hue={18} className="w-full !animate-none !shadow-none" />
          </div>
        </div>
        <span className="absolute bottom-3 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_20px_rgba(79,95,230,0.6)]">
          <ScanLine size={16} />
        </span>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="glass-inner flex aspect-[4/3] items-center gap-3 px-4">
        <div className="w-16 shrink-0">
          <HoloCard name="Dracaufeu" set="4/102" price="" variation="+6,2 %" hue={18} className="w-full !animate-none" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-bold text-text-primary">Dracaufeu</span>
          <span className="text-[11px] text-text-secondary">Set de Base · 4/102</span>
          <span className="demo-price mt-1 text-2xl font-extrabold tracking-tight text-text-primary">
            533,88 €
          </span>
          <span className="text-[11px] font-semibold text-up">+6,2 % sur 30 j</span>
        </div>
      </div>
    );
  }
  return (
    <div className="glass-inner flex aspect-[4/3] flex-col justify-center gap-3 px-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-text-secondary">Ma collection</span>
        <span className="text-xl font-extrabold tracking-tight text-text-primary">1 284,50 €</span>
      </div>
      <div className="flex h-3 gap-1 overflow-hidden rounded-full">
        <span className="w-[17%] rounded-full bg-gauge-down" />
        <span className="w-[37%] rounded-full bg-gauge-stable shadow-inner" />
        <span className="flex-1 rounded-full bg-gauge-up" />
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-down">4 en baisse</span>
        <span className="text-text-muted">9 stables</span>
        <span className="text-up">11 en hausse</span>
      </div>
      <span className="text-sm font-bold text-up">+96,40 € sur 30 jours</span>
    </div>
  );
}

/** Visuel de chaque axe marketing. */
function AxisVisual({ kind }: { kind: "price" | "moves" | "share" }) {
  if (kind === "price") {
    return (
      <div className="relative mx-auto grid max-w-md gap-3">
        <div className="glass-card flex items-center justify-between px-5 py-4 opacity-70">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Ailleurs</p>
            <p className="text-sm text-text-secondary">Estimation, marché américain</p>
          </div>
          <span className="text-2xl font-bold text-text-muted line-through">$ 612</span>
        </div>
        <div className="glass-card-strong flex items-center justify-between px-5 py-5 ring-2 ring-accent/60">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-accent-dark">{APP_NAME}</p>
            <p className="text-sm text-text-secondary">Cote Cardmarket, tendance</p>
          </div>
          <span className="demo-price text-3xl font-extrabold tracking-tight text-text-primary">
            533,88 €
          </span>
        </div>
        <p className="text-center text-[11px] text-text-muted">Illustration, montants d&apos;exemple.</p>
      </div>
    );
  }
  if (kind === "moves") {
    const rows = [
      { n: "Pikachu", s: "58/102", p: "15,45 €", v: "+80,5 %", up: true },
      { n: "Dracaufeu", s: "4/102", p: "533,88 €", v: "+6,2 %", up: true },
      { n: "Drascore", s: "4/102", p: "2,43 €", v: "−39,9 %", up: false },
      { n: "Feunnec", s: "25/162", p: "0,44 €", v: "+15,8 %", up: true },
    ];
    return (
      <div className="glass-card-strong mx-auto flex max-w-md flex-col divide-y divide-black/5 px-4 py-2">
        {rows.map((r, i) => (
          <Reveal key={r.n} delay={i * 110} className="flex items-center gap-3 py-3">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{r.n}</span>
            <span className="text-xs text-text-secondary">{r.s}</span>
            <span className="flex w-[90px] flex-col items-end">
              <span className="text-sm font-bold text-text-primary">{r.p}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] font-bold",
                  r.up ? "bg-up/10 text-up" : "bg-down/10 text-down",
                )}
              >
                {r.v}
              </span>
            </span>
          </Reveal>
        ))}
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      <div className="pill-group w-fit">
        {["Ajout", "Valeur", "Nom", "Variation"].map((s, i) => (
          <span key={s} className={cn("pill", i === 1 && "pill-active")}>
            {s}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["Set de Base", "Holo", "Rare"].map((t) => (
          <span key={t} className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent-dark">
            {t}
          </span>
        ))}
      </div>
      <div className="glass-card-strong flex items-center gap-3 px-4 py-3">
        <Share2 size={18} className="shrink-0 text-accent-dark" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
          tenpoint.app/u/ton-pseudo
        </span>
        <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white">Copier</span>
      </div>
      <p className="text-[11px] text-text-muted">
        <Library size={12} className="mr-1 inline" />
        Page publique en lecture seule : ni email, ni informations personnelles.
      </p>
      <p className="text-[11px] text-text-muted">
        <Coins size={12} className="mr-1 inline" />
        Les visiteurs voient les cotes, pas ton compte.
      </p>
    </div>
  );
}
