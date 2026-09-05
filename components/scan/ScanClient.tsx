"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Check,
  Circle,
  Cog,
  Droplets,
  ExternalLink,
  Flame,
  Leaf,
  Loader2,
  Moon,
  Mountain,
  RotateCcw,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/pricing";
import { BULK_SESSION_MAX, type Plan } from "@/lib/plans";
import { TopBar } from "@/components/nav/TopBar";
import { Viewfinder } from "./Viewfinder";

type PriceSet = {
  trend: number | null;
  low: number | null;
  avg30: number | null;
  variation: { pct: number; days: number } | null;
};

type ScannedCard = {
  id: string;
  name: string;
  set_name: string | null;
  set_code: string | null;
  release_date: string | null;
  number: string;
  set_printed_total: number | null;
  rarity: string | null;
  types: string[];
  image_large: string | null;
  ebay_url: string;
  variants: { normal: boolean; holo: boolean; reverse: boolean; firstEdition: boolean };
  prices: { normal: PriceSet; reverse: PriceSet };
};

type Props = {
  isPro: boolean;
  plan: Plan;
  initials: string;
  /** Quota mensuel, null pour un plan sans limite. */
  quota: number | null;
  scansThisMonth: number;
};

/** Durée de l'animation de reconnaissance avant la page carte. */
const REVEAL_MS = 2000;

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Feu: Flame,
  Eau: Droplets,
  Plante: Leaf,
  Électrique: Zap,
  Psy: Brain,
  Combat: Mountain,
  Obscurité: Moon,
  Métal: Cog,
  Fée: Sparkles,
  Dragon: Star,
};

export function ScanClient({ isPro, plan, initials, quota, scansThisMonth }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ScannedCard[] | null>(null);
  const [selected, setSelected] = useState<ScannedCard | null>(null);
  const [phase, setPhase] = useState<"reveal" | "details">("details");
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [isHolo, setIsHolo] = useState(false);
  const [isReverse, setIsReverse] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [scansLeft, setScansLeft] = useState<number | null>(
    quota === null ? null : Math.max(0, quota - scansThisMonth),
  );

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(0);
  const [bulkValue, setBulkValue] = useState(0);
  const [bulkBlocked, setBulkBlocked] = useState(false);

  // Chaque carte reconnue passe par l'animation de verrouillage avant la page.
  useEffect(() => {
    if (!selected) return;
    setPhase("reveal");
    const timer = setTimeout(() => setPhase("details"), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [selected]);

  function reset() {
    setCandidates(null);
    setSelected(null);
    setIsHolo(false);
    setIsReverse(false);
    setQuantity(1);
    setAdded(false);
    setError(null);
    if (shotUrl) URL.revokeObjectURL(shotUrl);
    setShotUrl(null);
  }

  async function handleFile(file: File) {
    reset();
    if (file.size > 10 * 1024 * 1024) {
      setError("Image trop lourde (max 10 Mo). Réduis la qualité ou recadre la photo.");
      return;
    }
    // La photo prise sert de fond à l'animation de reconnaissance.
    setShotUrl(URL.createObjectURL(file));
    setLoading(true);

    const body = new FormData();
    body.append("image", file);

    try {
      const res = await fetch("/api/scan", { method: "POST", body });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? "Le scan a échoué.");
        return;
      }

      setCandidates(json.cards);
      if (json.cards.length === 1) setSelected(json.cards[0]);
      setScansLeft(json.remaining_scans);
      // Retour haptique à la reconnaissance ; absent sur iOS, d'où l'optionnel.
      if (json.cards.length) navigator.vibrate?.(json.cards.length === 1 ? [30, 40, 70] : 30);
    } catch {
      setError("Connexion impossible. Vérifie ton réseau.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(thenNext: boolean) {
    if (!selected) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: selected.id,
          quantity,
          is_holo: isHolo,
          is_reverse: isReverse,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.message ?? "Ajout impossible.");
        return;
      }

      const unit = (isReverse ? selected.prices.reverse.trend : selected.prices.normal.trend) ?? 0;
      setBulkCount((c) => c + 1);
      setBulkValue((v) => v + unit * quantity);

      // La visée réapparaît d'elle-même une fois le résultat effacé.
      if (thenNext) reset();
      else setAdded(true);
    } catch {
      setError("Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  const price = selected ? (isReverse ? selected.prices.reverse : selected.prices.normal) : null;
  const bulkFull = bulkMode && bulkCount >= BULK_SESSION_MAX;

  function toggleBurst() {
    if (!isPro) {
      setBulkBlocked(true);
      return;
    }
    setBulkMode(!bulkMode);
    setBulkCount(0);
    setBulkValue(0);
  }

  const burstNotice = bulkBlocked ? (
    <>
      Scanner plusieurs cartes d&apos;affilée est réservé au Pro.{" "}
      <Link href="/pricing" className="underline">
        Voir les offres
      </Link>
    </>
  ) : bulkFull ? (
    `Session complète · ${BULK_SESSION_MAX} cartes`
  ) : bulkMode ? (
    `Rafale · ${bulkCount}/${BULK_SESSION_MAX} · ${formatEur(bulkValue)}`
  ) : null;

  const counter =
    quota === null
      ? "Scans illimités"
      : `${quota - (scansLeft ?? 0)}/${quota} scannée${quota - (scansLeft ?? 0) > 1 ? "s" : ""}`;

  const showingCard = selected !== null && price !== null && phase === "details";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {showingCard ? (
        // La page carte reprend la coque de l'application, comme sur la maquette.
        <div className="-mx-4 -mt-4">
          <TopBar initials={initials} plan={plan} />
        </div>
      ) : (
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-base font-bold leading-tight text-text-primary">Scanner une carte</h1>
            <p className="text-[11px] text-text-secondary">{counter}</p>
          </div>
          <Link
            href="/home"
            aria-label="Retour à l'accueil"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-primary shadow-inner"
          >
            <ArrowLeft size={18} />
          </Link>
        </header>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {!candidates && !loading && (
          <Viewfinder
            burstActive={bulkMode}
            notice={burstNotice}
            onCapture={handleFile}
            onImport={() => fileRef.current?.click()}
            onNativeCamera={() => cameraRef.current?.click()}
            onToggleBurst={toggleBurst}
          />
        )}

        {loading && !selected && (
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[28px] bg-[#101438] shadow-card">
            {shotUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shotUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-40 blur-[2px]"
              />
            )}
            <div className="relative flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-white" size={30} />
              <p className="text-sm font-medium text-white/85">Identification en cours…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="glass-card border-l-2 border-l-down px-4 py-3">
            <p className="text-sm text-text-primary">{error}</p>
            <button onClick={reset} className="mt-2 text-xs text-accent-dark hover:underline">
              Réessayer
            </button>
          </div>
        )}

        {candidates && candidates.length > 1 && !selected && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">
              Plusieurs cartes correspondent. Choisis la bonne :
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {candidates.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelected(card)}
                  className="glass-card flex flex-col gap-2 p-2 text-left transition-colors hover:bg-black/5"
                >
                  <Image
                    src={card.image_large ?? ""}
                    alt={card.name}
                    width={245}
                    height={342}
                    className="w-full rounded-lg"
                    unoptimized
                  />
                  <span className="text-xs font-semibold text-text-primary">{card.name}</span>
                  <span className="text-[11px] text-text-muted">
                    {card.set_name} · {card.number}/{card.set_printed_total}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selected && price && phase === "reveal" && (
          <RevealScene
            card={selected}
            price={price.trend}
            shotUrl={shotUrl}
            total={bulkMode ? bulkValue + (price.trend ?? 0) : null}
            onSkip={() => setPhase("details")}
          />
        )}

        {showingCard && (
          <CardPage
            card={selected}
            price={price}
            isHolo={isHolo}
            isReverse={isReverse}
            quantity={quantity}
            added={added}
            loading={loading}
            bulkMode={bulkMode}
            bulkFull={bulkFull}
            hasAlternatives={(candidates?.length ?? 0) > 1}
            onHolo={() => setIsHolo(!isHolo)}
            onReverse={() => setIsReverse(!isReverse)}
            onQuantity={setQuantity}
            onAdd={handleAdd}
            onReset={reset}
            onBack={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Verrouillage de la carte reconnue : la photo prise reste en fond, la carte
 * officielle surgit avec un halo, les coins se referment dessus et le prix
 * claque au centre.
 */
function RevealScene({
  card,
  price,
  shotUrl,
  total,
  onSkip,
}: {
  card: ScannedCard;
  price: number | null;
  shotUrl: string | null;
  total: number | null;
  onSkip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="Voir la carte"
      className="relative flex min-h-0 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-[28px] bg-[#101438] shadow-card"
    >
      {shotUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shotUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45 blur-[2px]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      {total !== null && (
        <div className="absolute left-5 top-5 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-300">Total</p>
          <p className="text-xl font-extrabold text-white drop-shadow">{formatEur(total)}</p>
        </div>
      )}

      <div className="relative aspect-[63/88] w-[62%] max-w-[280px]">
        <div className="lock-corners absolute -inset-3">
          {[
            "left-0 top-0 rounded-tl-2xl border-l-[6px] border-t-[6px]",
            "right-0 top-0 rounded-tr-2xl border-r-[6px] border-t-[6px]",
            "bottom-0 left-0 rounded-bl-2xl border-b-[6px] border-l-[6px]",
            "bottom-0 right-0 rounded-br-2xl border-b-[6px] border-r-[6px]",
          ].map((c) => (
            <span key={c} className={cn("absolute h-10 w-10 border-white drop-shadow-lg", c)} />
          ))}
        </div>

        <div className="reveal-card h-full w-full overflow-hidden rounded-xl">
          <Image
            src={card.image_large ?? ""}
            alt={card.name}
            width={490}
            height={684}
            className="h-full w-full object-cover"
            unoptimized
            priority
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="price-slam text-[44px] font-extrabold tracking-tight text-white">
            {formatEur(price)}
          </span>
        </div>
      </div>
    </button>
  );
}

/** Page carte, d'après la maquette : visuel, prix moyen, détails, puis l'ajout. */
function CardPage({
  card,
  price,
  isHolo,
  isReverse,
  quantity,
  added,
  loading,
  bulkMode,
  bulkFull,
  hasAlternatives,
  onHolo,
  onReverse,
  onQuantity,
  onAdd,
  onReset,
  onBack,
}: {
  card: ScannedCard;
  price: PriceSet;
  isHolo: boolean;
  isReverse: boolean;
  quantity: number;
  added: boolean;
  loading: boolean;
  bulkMode: boolean;
  bulkFull: boolean;
  hasAlternatives: boolean;
  onHolo: () => void;
  onReverse: () => void;
  onQuantity: (q: number) => void;
  onAdd: (thenNext: boolean) => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const type = card.types[0] ?? null;
  const TypeIcon = (type && TYPE_ICONS[type]) || Circle;
  const variation = price.variation;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="card-reveal relative mx-auto w-[64%] max-w-[260px] overflow-hidden rounded-xl shadow-[0_18px_40px_rgba(20,25,90,0.35)]">
        <Image
          src={card.image_large ?? ""}
          alt={card.name}
          width={490}
          height={684}
          className="w-full"
          unoptimized
          priority
        />
        <span className="card-shine" aria-hidden />
      </div>

      <section className="glass-card-strong flex items-center gap-4 px-4 py-4">
        <div className="w-[76px] shrink-0 overflow-hidden rounded-md shadow-inner">
          <Image
            src={card.image_large ?? ""}
            alt=""
            width={245}
            height={342}
            className="w-full"
            unoptimized
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
          <p className="text-sm font-bold text-text-primary">Tendance Cardmarket :</p>
          <p className="price-pop mt-1 leading-none">
            <SplitPrice value={price.trend} />
          </p>
          {variation ? (
            <p className={cn("mt-1 text-sm font-bold", variation.pct >= 0 ? "text-up" : "text-down")}>
              {variation.pct >= 0 ? "+" : ""}
              {variation.pct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % sur {variation.days} j
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-text-muted">Variation : pas encore mesurée</p>
          )}
          <p className="mt-1 text-[11px] text-text-muted">
            Moy. 30 j {formatEur(price.avg30)} · À partir de {formatEur(price.low)}
          </p>
        </div>
      </section>

      <section className="glass-card-strong flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">Détails de la carte :</h2>
          <span className="text-sm font-bold text-text-primary">
            <span className="text-accent">#</span> {card.number}
            {card.set_printed_total ? `/${card.set_printed_total}` : ""}
          </span>
        </div>
        <div className="glass-inner grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-3">
          <Detail label="Rareté">
            <Star size={14} className="fill-text-muted text-text-muted" />
            {card.rarity ?? "—"}
          </Detail>
          <Detail label="Type">
            <TypeIcon size={14} className={cn(type === "Feu" && "fill-down text-down")} />
            {type ?? "—"}
          </Detail>
        </div>
        <div className="glass-inner grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-3">
          <Detail label="Collection">{card.set_code ?? card.set_name ?? "—"}</Detail>
          <Detail label="Date de sortie">{formatReleaseDate(card.release_date)}</Detail>
        </div>
        <a
          href={card.ebay_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 self-end text-xs text-accent-dark hover:underline"
        >
          Voir sur eBay <ExternalLink size={12} />
        </a>
      </section>

      <section className="glass-card-strong flex flex-col gap-4 px-4 py-4">
        <p className="text-[11px] text-text-muted">
          Prix Cardmarket pour une carte non gradée. Le tarif dépend de la variante : coche
          ci-dessous ce que tu possèdes.
        </p>

        {(card.variants?.holo || card.variants?.reverse) && (
          <div className="flex flex-wrap gap-2">
            {card.variants?.holo && <Toggle label="Holo" active={isHolo} onClick={onHolo} />}
            {card.variants?.reverse && (
              <Toggle label="Reverse" active={isReverse} onClick={onReverse} />
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="text-sm text-text-secondary">Quantité</label>
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => onQuantity(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
            className="field w-20 text-center"
          />
        </div>

        {added ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm text-up">
              <Check size={16} /> Ajoutée à ta collection.
            </p>
            <div className="flex gap-2">
              <button onClick={onReset} className="btn-secondary flex-1">
                Scanner une autre carte
              </button>
              <Link href="/collection" className="btn-secondary flex-1">
                Voir ma collection
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button onClick={() => onAdd(false)} disabled={loading} className="btn-primary">
              Ajouter à ma collection
            </button>
            {bulkMode && !bulkFull && (
              <button onClick={() => onAdd(true)} disabled={loading} className="btn-secondary">
                <RotateCcw size={14} /> Ajouter &amp; suivant
              </button>
            )}
            {hasAlternatives && (
              <button onClick={onBack} className="text-xs text-text-secondary hover:text-text-primary">
                Ce n&apos;est pas la bonne carte
              </button>
            )}
            <button onClick={onReset} className="text-xs text-text-secondary hover:text-text-primary">
              Scanner une autre carte
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/** « 456,76 € » avec l'entier en gras encre et les décimales en gris, comme sur la maquette. */
function SplitPrice({ value }: { value: number | null }) {
  if (value === null) return <span className="text-3xl font-extrabold text-text-muted">—</span>;
  const [whole, rest] = formatEur(value).split(",");
  return (
    <>
      <span className="text-[40px] font-extrabold tracking-tight text-text-primary">{whole}</span>
      <span className="text-[26px] font-bold text-text-muted">,{rest}</span>
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-text-muted">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-bold text-text-primary">{children}</span>
    </div>
  );
}

function formatReleaseDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const s = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-inner transition-colors",
        active
          ? "bg-accent/15 text-accent-dark ring-2 ring-accent/60"
          : "bg-glass-inner text-text-muted hover:text-text-secondary",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border",
          active ? "border-accent bg-accent" : "border-black/20 bg-white",
        )}
      >
        {active && <Check size={12} className="text-white" />}
      </span>
      {label}
    </button>
  );
}
