"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/pricing";
import type { CollectionEntry } from "@/lib/collection";

type SortKey = "added" | "value" | "name" | "variation";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "added", label: "Ajout" },
  { key: "value", label: "Valeur" },
  { key: "name", label: "Nom" },
  { key: "variation", label: "Variation" },
];

type Props = {
  entries: CollectionEntry[];
  totalValue: number;
  limitReached: boolean;
  hiddenCount: number;
};

export function CollectionClient({
  entries,
  totalValue,
  limitReached,
  hiddenCount,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(entries);
  const [sort, setSort] = useState<SortKey>("added");
  const [setFilter, setSetFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [variantFilter, setVariantFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sets = useMemo(
    () =>
      [...new Set(items.map((i) => i.card.setName).filter(Boolean))].sort() as string[],
    [items],
  );
  const rarities = useMemo(
    () =>
      [...new Set(items.map((i) => i.card.rarity).filter(Boolean))].sort() as string[],
    [items],
  );

  const visible = useMemo(() => {
    const filtered = items.filter((i) => {
      if (setFilter && i.card.setName !== setFilter) return false;
      if (rarityFilter && i.card.rarity !== rarityFilter) return false;
      if (variantFilter === "holo" && !i.isHolo) return false;
      if (variantFilter === "reverse" && !i.isReverse) return false;
      if (variantFilter === "normale" && (i.isHolo || i.isReverse)) return false;
      return true;
    });

    // Les cartes sans prix connu retombent en bas des tris chiffrés.
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "value":
          return (b.lineValue ?? -1) - (a.lineValue ?? -1);
        case "name":
          return a.card.name.localeCompare(b.card.name, "fr");
        case "variation":
          return (b.variationPct ?? -Infinity) - (a.variationPct ?? -Infinity);
        default:
          return b.addedAt.localeCompare(a.addedAt);
      }
    });
  }, [items, sort, setFilter, rarityFilter, variantFilter]);

  const visibleValue = visible.reduce((sum, i) => sum + (i.lineValue ?? 0), 0);
  const isFiltered = Boolean(setFilter || rarityFilter || variantFilter);

  async function changeQuantity(entry: CollectionEntry, delta: number) {
    const next = entry.quantity + delta;
    if (next < 1 || next > 99) return;

    setBusyId(entry.id);
    const res = await fetch(`/api/collection/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: next }),
    });
    setBusyId(null);
    if (!res.ok) return;

    setItems((prev) =>
      prev.map((i) =>
        i.id === entry.id
          ? {
              ...i,
              quantity: next,
              lineValue: i.unitPrice === null ? null : i.unitPrice * next,
            }
          : i,
      ),
    );
    router.refresh();
  }

  async function remove(entry: CollectionEntry) {
    setBusyId(entry.id);
    const res = await fetch(`/api/collection/${entry.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) return;

    setItems((prev) => prev.filter((i) => i.id !== entry.id));
    router.refresh();
  }

  if (!items.length) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <h1 className="text-xl font-semibold text-text-primary">Ma collection</h1>
        <div className="glass-card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-text-secondary">Ta collection est encore vide.</p>
          <p className="text-sm text-text-muted">
            Ta collection vaut peut-être plus que tu ne crois. Scanne tes premières
            cartes pour le savoir.
          </p>
          <Link
            href="/scan"
            className="mt-2 rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Scanner une carte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Ma collection</h1>
        <span className="font-mono text-sm text-text-primary">
          {formatEur(totalValue)}
        </span>
      </div>

      {limitReached && (
        <p className="glass-card border-l-2 border-l-warn px-4 py-3 text-sm text-text-primary">
          Ton plan Free affiche les 100 premières cartes.{" "}
          {hiddenCount > 0 && <>{hiddenCount} carte(s) sont masquées. </>}
          Supprime des cartes ou{" "}
          <Link href="/pricing" className="text-warn underline">
            passe Pro
          </Link>
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border border-glass-border bg-glass p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                sort === s.key
                  ? "bg-accent/40 text-accent-light"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 rounded-full border border-glass-border px-3 py-1.5 text-xs transition-colors",
            isFiltered ? "bg-accent/40 text-accent-light" : "bg-glass text-text-muted",
          )}
        >
          <SlidersHorizontal size={13} />
          Filtres{isFiltered ? " ·" : ""}
        </button>
      </div>

      {showFilters && (
        <div className="glass-card flex flex-col gap-3 px-4 py-4">
          <Select label="Set" value={setFilter} onChange={setSetFilter} options={sets} />
          <Select
            label="Rareté"
            value={rarityFilter}
            onChange={setRarityFilter}
            options={rarities}
          />
          <Select
            label="Variante"
            value={variantFilter}
            onChange={setVariantFilter}
            options={["normale", "holo", "reverse"]}
          />
          {isFiltered && (
            <button
              onClick={() => {
                setSetFilter("");
                setRarityFilter("");
                setVariantFilter("");
              }}
              className="self-start text-xs text-accent-light hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-text-muted">
        {visible.length} carte{visible.length > 1 ? "s" : ""}
        {isFiltered && <> · {formatEur(visibleValue)}</>}
      </p>

      <ul className="flex flex-col gap-2">
        {visible.map((entry) => (
          <li key={entry.id} className="glass-card flex items-center gap-3 p-3">
            {entry.card.imageSmall && (
              <Image
                src={entry.card.imageSmall}
                alt={entry.card.name}
                width={60}
                height={84}
                className="w-12 shrink-0 rounded"
                unoptimized
              />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-primary">{entry.card.name}</p>
              <p className="truncate text-xs text-text-muted">
                {entry.card.setName}
                {entry.card.number ? ` · ${entry.card.number}` : ""}
                {entry.card.setPrintedTotal ? `/${entry.card.setPrintedTotal}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {entry.isHolo && <Tag>Holo</Tag>}
                {entry.isReverse && <Tag>Reverse</Tag>}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="font-mono text-sm text-text-primary">
                {formatEur(entry.lineValue)}
              </span>
              {entry.variationPct !== null && (
                <span
                  className={cn(
                    "font-mono text-[11px]",
                    entry.variationPct >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {entry.variationPct >= 0 ? "+" : ""}
                  {entry.variationPct} %
                </span>
              )}

              <div className="mt-1 flex items-center gap-1">
                <IconButton
                  onClick={() => changeQuantity(entry, -1)}
                  disabled={busyId === entry.id || entry.quantity <= 1}
                  label="Retirer un exemplaire"
                >
                  <Minus size={12} />
                </IconButton>
                <span className="w-6 text-center font-mono text-xs text-text-primary">
                  {entry.quantity}
                </span>
                <IconButton
                  onClick={() => changeQuantity(entry, 1)}
                  disabled={busyId === entry.id || entry.quantity >= 99}
                  label="Ajouter un exemplaire"
                >
                  <Plus size={12} />
                </IconButton>
                <IconButton
                  onClick={() => remove(entry)}
                  disabled={busyId === entry.id}
                  label="Supprimer la carte"
                  danger
                >
                  <Trash2 size={12} />
                </IconButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-glass-border px-2 py-0.5 text-[10px] text-text-secondary">
      {children}
    </span>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs text-text-secondary">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-glass-border bg-[#24243e] px-2 py-1.5 text-xs text-text-primary outline-none"
      >
        <option value="">Toutes</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded border border-glass-border transition-colors disabled:opacity-30",
        danger ? "text-down hover:bg-down/15" : "text-text-secondary hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
