"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Euro, TrendingUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEur, formatPct } from "@/lib/pricing";

export type TopCard = {
  id: string;
  name: string;
  number: string | null;
  setPrintedTotal: number | null;
  imageSmall: string | null;
  lineValue: number | null;
  variationPct: number | null;
};

type Mode = "value" | "rise";

/**
 * « Mes Cartes » : les cinq premières, classées par valeur ou par hausse sur
 * 30 jours selon le bouton en haut à droite. La disposition suit la maquette :
 * nom, numéro dans le set, visuel, prix et variation.
 */
export function TopFiveSwitcher({
  byValue,
  byRise,
}: {
  byValue: TopCard[];
  byRise: TopCard[];
}) {
  const [mode, setMode] = useState<Mode>("value");
  const cards = mode === "value" ? byValue : byRise;

  return (
    <section className="glass-card-strong flex flex-col gap-3 px-4 pb-4 pt-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-text-primary">Mes Cartes</h2>

        <div
          className="glass-inner flex items-center gap-1 rounded-full p-1"
          role="group"
          aria-label="Classement"
        >
          <ToggleIcon
            active={mode === "value"}
            onClick={() => setMode("value")}
            label="Classer par valeur"
          >
            <Euro size={13} strokeWidth={2.5} />
          </ToggleIcon>
          <ToggleIcon
            active={mode === "rise"}
            onClick={() => setMode("rise")}
            label="Classer par hausse sur 30 jours"
          >
            <TrendingUp size={14} strokeWidth={2.5} />
          </ToggleIcon>
        </div>
      </div>

      <div className="glass-inner flex flex-col px-4 pb-3 pt-1">
        {cards.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            {mode === "value"
              ? "Aucune carte valorisée pour l'instant."
              : "Pas encore de variation mesurée sur tes cartes."}
          </p>
        ) : (
          <ol className="flex flex-col divide-y divide-black/5">
            {cards.map((card) => (
              <li key={card.id} className="flex items-center gap-3 py-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
                  {card.name}
                </p>
                <span className="shrink-0 text-xs text-text-secondary">
                  {card.number ?? "—"}
                  {card.setPrintedTotal ? `/${card.setPrintedTotal}` : ""}
                </span>
                {card.imageSmall ? (
                  <Image
                    src={card.imageSmall}
                    alt=""
                    width={36}
                    height={50}
                    className="w-9 shrink-0 rounded-md shadow-inner"
                    unoptimized
                  />
                ) : (
                  <span className="h-[50px] w-9 shrink-0 rounded-md bg-black/5" />
                )}
                <div className="flex w-[84px] shrink-0 flex-col items-end">
                  <span className="text-sm font-bold text-text-primary">
                    {formatEur(card.lineValue)}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      card.variationPct === null
                        ? "text-text-muted"
                        : card.variationPct >= 0
                          ? "text-[#2f8f5b]"
                          : "text-[#c2453a]",
                    )}
                  >
                    {formatPct(card.variationPct)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="flex justify-end pt-1">
          <Link
            href="/collection"
            className="flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-text-primary shadow-inner transition-colors hover:bg-black/5"
          >
            Voir plus <Plus size={12} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ToggleIcon({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
        active ? "bg-[#2fa06a] text-white" : "text-text-muted hover:text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}
