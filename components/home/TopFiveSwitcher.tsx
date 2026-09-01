"use client";

import { useState } from "react";
import Image from "next/image";
import { Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/pricing";

export type TopCard = {
  id: string;
  name: string;
  setName: string | null;
  imageSmall: string | null;
  lineValue: number | null;
  variationPct: number | null;
};

type Mode = "value" | "rise";

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
    <section className="glass-card flex flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-primary">
          {mode === "value" ? "Top valeur" : "Top hausse 30 j"}
        </h2>

        <div className="flex gap-1 rounded-full border border-glass-border bg-glass p-1">
          <ToggleIcon
            active={mode === "value"}
            onClick={() => setMode("value")}
            label="Top valeur"
          >
            <Trophy size={15} />
          </ToggleIcon>
          <ToggleIcon
            active={mode === "rise"}
            onClick={() => setMode("rise")}
            label="Top hausse 30 jours"
          >
            <TrendingUp size={15} />
          </ToggleIcon>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">
          {mode === "value"
            ? "Aucune carte valorisée pour l'instant."
            : "Pas encore de variation mesurée sur tes cartes."}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {cards.map((card, i) => (
            <li key={card.id} className="flex items-center gap-3">
              <span className="w-4 shrink-0 font-mono text-xs text-text-muted">
                {i + 1}
              </span>
              {card.imageSmall && (
                <Image
                  src={card.imageSmall}
                  alt={card.name}
                  width={40}
                  height={56}
                  className="w-8 shrink-0 rounded"
                  unoptimized
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{card.name}</p>
                <p className="truncate text-[11px] text-text-muted">{card.setName}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono text-xs text-text-primary">
                  {formatEur(card.lineValue)}
                </span>
                {card.variationPct !== null && (
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      card.variationPct >= 0 ? "text-up" : "text-down",
                    )}
                  >
                    {card.variationPct >= 0 ? "+" : ""}
                    {card.variationPct} %
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
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
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
        active ? "bg-accent/40 text-accent-light" : "text-text-muted hover:text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}
