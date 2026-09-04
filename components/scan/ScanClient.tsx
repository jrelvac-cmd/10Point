"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Check, ExternalLink, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/pricing";
import { BULK_SESSION_MAX } from "@/lib/plans";
import { Viewfinder } from "./Viewfinder";

type PriceSet = {
  trend: number | null;
  low: number | null;
  avg30: number | null;
  variation_30d: number | null;
};

type ScannedCard = {
  id: string;
  name: string;
  set_name: string | null;
  number: string;
  set_printed_total: number | null;
  rarity: string | null;
  image_large: string | null;
  ebay_url: string;
  variants: { normal: boolean; holo: boolean; reverse: boolean; firstEdition: boolean };
  prices: { normal: PriceSet; reverse: PriceSet };
};

type Props = {
  isPro: boolean;
  remainingScans: number | null;
};

export function ScanClient({ isPro, remainingScans }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ScannedCard[] | null>(null);
  const [selected, setSelected] = useState<ScannedCard | null>(null);
  const [isHolo, setIsHolo] = useState(false);
  const [isReverse, setIsReverse] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [scansLeft, setScansLeft] = useState(remainingScans);

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(0);
  const [bulkValue, setBulkValue] = useState(0);
  const [bulkBlocked, setBulkBlocked] = useState(false);

  function reset() {
    setCandidates(null);
    setSelected(null);
    setIsHolo(false);
    setIsReverse(false);
    setQuantity(1);
    setAdded(false);
    setError(null);
  }

  async function handleFile(file: File) {
    reset();
    if (file.size > 10 * 1024 * 1024) {
      setError("Image trop lourde (max 10 Mo). Réduis la qualité ou recadre la photo.");
      return;
    }
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

  return (
    <div className="flex flex-col gap-4 py-4">
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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Scanner une carte</h1>
        {scansLeft !== null && (
          <span className="font-semibold text-xs text-text-secondary">
            {scansLeft} scan{scansLeft > 1 ? "s" : ""} restant{scansLeft > 1 ? "s" : ""}
          </span>
        )}
      </div>

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

      {loading && (
        <div className="glass-card flex flex-col items-center gap-3 px-6 py-12">
          <Loader2 className="animate-spin text-accent-dark" size={28} />
          <p className="text-sm text-text-secondary">Identification en cours…</p>
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

      {selected && price && (
        <div className="glass-card-strong flex flex-col gap-4 p-4">
          <div className="flex gap-4">
            <Image
              src={selected.image_large ?? ""}
              alt={selected.name}
              width={245}
              height={342}
              className="w-28 shrink-0 rounded-lg"
              unoptimized
            />
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-text-primary">{selected.name}</h2>
              <p className="text-xs text-text-secondary">
                {selected.set_name} · {selected.number}/{selected.set_printed_total}
              </p>
              {selected.rarity && (
                <p className="text-xs text-text-muted">{selected.rarity}</p>
              )}

              <p className="mt-2 text-[28px] font-extrabold tracking-tight text-text-primary">
                {formatEur(price.trend)}
              </p>
              {price.variation_30d !== null && (
                <p
                  className={cn(
                    "font-semibold text-xs",
                    price.variation_30d >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {price.variation_30d >= 0 ? "+" : ""}
                  {price.variation_30d} % sur 30 j
                </p>
              )}
              <p className="mt-1 font-semibold text-[11px] text-text-muted">
                bas {formatEur(price.low)} · moy. 30 j {formatEur(price.avg30)}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-text-muted">
            Prix Cardmarket pour une carte non gradée. Le tarif dépend de la variante :
            coche ci-dessous ce que tu possèdes.
          </p>

          {(selected.variants?.holo || selected.variants?.reverse) && (
            <div className="flex flex-wrap gap-2">
              {selected.variants?.holo && (
                <Toggle label="Holo" active={isHolo} onClick={() => setIsHolo(!isHolo)} />
              )}
              {selected.variants?.reverse && (
                <Toggle
                  label="Reverse"
                  active={isReverse}
                  onClick={() => setIsReverse(!isReverse)}
                />
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
              onChange={(e) =>
                setQuantity(Math.min(99, Math.max(1, Number(e.target.value) || 1)))
              }
              className="glass-card w-20 bg-transparent px-3 py-2 text-center font-semibold text-sm text-text-primary outline-none"
            />
            <a
              href={selected.ebay_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-accent-dark hover:underline"
            >
              Voir sur eBay <ExternalLink size={12} />
            </a>
          </div>

          {added ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm text-up">
                <Check size={16} /> Ajoutée à ta collection.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="btn-secondary flex-1"
                >
                  Scanner une autre carte
                </button>
                <Link
                  href="/collection"
                  className="btn-secondary flex-1"
                >
                  Voir ma collection
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleAdd(false)}
                disabled={loading}
                className="btn-primary"
              >
                Ajouter à ma collection
              </button>
              {bulkMode && !bulkFull && (
                <button
                  onClick={() => handleAdd(true)}
                  disabled={loading}
                  className="btn-secondary"
                >
                  <RotateCcw size={14} /> Ajouter &amp; suivant
                </button>
              )}
              {candidates && candidates.length > 1 && (
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Ce n&apos;est pas la bonne carte
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
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
