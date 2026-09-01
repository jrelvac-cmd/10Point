"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Upload, Loader2, Check, ExternalLink, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/pricing";
import { BULK_SESSION_MAX } from "@/lib/plans";

type PriceSet = {
  trend: number | null;
  low: number | null;
  avg30: number | null;
  variation_30d: number | null;
};

type ScannedCard = {
  id: string;
  name: string;
  name_en: string;
  set_name: string;
  number: string;
  set_printed_total: number;
  rarity: string | null;
  image_large: string;
  ebay_url: string;
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

      if (thenNext) {
        reset();
        cameraRef.current?.click();
      } else {
        setAdded(true);
      }
    } catch {
      setError("Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  const price = selected ? (isReverse ? selected.prices.reverse : selected.prices.normal) : null;
  const bulkFull = bulkMode && bulkCount >= BULK_SESSION_MAX;

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
        <h1 className="text-xl font-semibold text-text-primary">Scanner une carte</h1>
        {scansLeft !== null && (
          <span className="font-mono text-xs text-text-secondary">
            {scansLeft} scan{scansLeft > 1 ? "s" : ""} restant{scansLeft > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isPro && (
        <button
          onClick={() => {
            setBulkMode(!bulkMode);
            setBulkCount(0);
            setBulkValue(0);
          }}
          className={cn(
            "glass-card px-4 py-3 text-left text-sm transition-colors",
            bulkMode ? "bg-accent/30 text-accent-light" : "text-text-secondary",
          )}
        >
          {bulkMode
            ? `Session rafale active — ${bulkCount}/${BULK_SESSION_MAX} cartes · ${formatEur(bulkValue)}`
            : "Activer le mode rafale (Pro)"}
        </button>
      )}

      {bulkFull && (
        <p className="glass-card px-4 py-3 text-sm text-warn">
          Session complète ({BULK_SESSION_MAX} cartes). Termine-la pour en démarrer une nouvelle.
        </p>
      )}

      {!candidates && !loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="glass-card flex flex-col items-center gap-2 px-6 py-10 text-text-primary transition-colors hover:bg-white/15"
          >
            <Camera size={28} className="text-accent-light" />
            <span className="text-sm font-medium">Prendre une photo</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="glass-card flex flex-col items-center gap-2 px-6 py-10 text-text-primary transition-colors hover:bg-white/15"
          >
            <Upload size={28} className="text-accent-light" />
            <span className="text-sm font-medium">Choisir un fichier</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="glass-card flex flex-col items-center gap-3 px-6 py-12">
          <Loader2 className="animate-spin text-accent-light" size={28} />
          <p className="text-sm text-text-secondary">Identification en cours…</p>
        </div>
      )}

      {error && (
        <div className="glass-card border-l-2 border-l-down px-4 py-3">
          <p className="text-sm text-text-primary">{error}</p>
          <button onClick={reset} className="mt-2 text-xs text-accent-light hover:underline">
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
                className="glass-card flex flex-col gap-2 p-2 text-left transition-colors hover:bg-white/15"
              >
                <Image
                  src={card.image_large}
                  alt={card.name}
                  width={245}
                  height={342}
                  className="w-full rounded-lg"
                  unoptimized
                />
                <span className="text-xs text-text-primary">{card.name}</span>
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
              src={selected.image_large}
              alt={selected.name}
              width={245}
              height={342}
              className="w-28 shrink-0 rounded-lg"
              unoptimized
            />
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold text-text-primary">{selected.name}</h2>
              <p className="text-xs text-text-secondary">
                {selected.set_name} · {selected.number}/{selected.set_printed_total}
              </p>
              {selected.rarity && (
                <p className="text-xs text-text-muted">{selected.rarity}</p>
              )}

              <p className="mt-2 font-mono text-2xl text-text-primary">
                {formatEur(price.trend)}
              </p>
              {price.variation_30d !== null && (
                <p
                  className={cn(
                    "font-mono text-xs",
                    price.variation_30d >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {price.variation_30d >= 0 ? "+" : ""}
                  {price.variation_30d} % sur 30 j
                </p>
              )}
              <p className="mt-1 font-mono text-[11px] text-text-muted">
                bas {formatEur(price.low)} · moy. 30 j {formatEur(price.avg30)}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-text-muted">
            Prix Cardmarket pour une carte non gradée. Le tarif dépend de la variante :
            coche ci-dessous ce que tu possèdes.
          </p>

          <div className="flex flex-wrap gap-2">
            <Toggle label="Holo" active={isHolo} onClick={() => setIsHolo(!isHolo)} />
            <Toggle
              label="Reverse"
              active={isReverse}
              onClick={() => setIsReverse(!isReverse)}
            />
          </div>

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
              className="glass-card w-20 bg-transparent px-3 py-2 text-center font-mono text-sm text-text-primary outline-none"
            />
            <a
              href={selected.ebay_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-accent-light hover:underline"
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
                  className="glass-card flex-1 px-4 py-3 text-sm text-text-primary hover:bg-white/15"
                >
                  Scanner une autre carte
                </button>
                <Link
                  href="/collection"
                  className="glass-card flex-1 px-4 py-3 text-center text-sm text-text-primary hover:bg-white/15"
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
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                Ajouter à ma collection
              </button>
              {bulkMode && !bulkFull && (
                <button
                  onClick={() => handleAdd(true)}
                  disabled={loading}
                  className="glass-card flex items-center justify-center gap-2 px-4 py-3 text-sm text-text-primary hover:bg-white/15 disabled:opacity-50"
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
        "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
        active
          ? "border-accent bg-accent/30 text-accent-light"
          : "border-glass-border bg-glass text-text-muted hover:text-text-secondary",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border",
          active ? "border-accent-light bg-accent-light" : "border-white/30",
        )}
      >
        {active && <Check size={12} className="text-[#1e1b4b]" />}
      </span>
      {label}
    </button>
  );
}
