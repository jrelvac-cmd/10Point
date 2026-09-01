"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  shareCollection: boolean;
  notifyPriceChange: boolean;
  username: string;
  publicUrl: string;
  isPro: boolean;
};

export function SettingsClient({
  shareCollection,
  notifyPriceChange,
  publicUrl,
  isPro,
}: Props) {
  const [share, setShare] = useState(shareCollection);
  const [notify, setNotify] = useState(notifyPriceChange);
  const [copied, setCopied] = useState(false);
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "sent" | "error">(
    "idle",
  );
  const [busy, setBusy] = useState(false);

  async function save(patch: Record<string, boolean>) {
    setBusy(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    return res.ok;
  }

  async function toggleShare() {
    const next = !share;
    setShare(next);
    if (!(await save({ share_collection: next }))) setShare(!next);
  }

  async function toggleNotify() {
    const next = !notify;
    setNotify(next);
    if (!(await save({ notify_price_change: next }))) setNotify(!next);
  }

  async function requestDeletion() {
    setBusy(true);
    const res = await fetch("/api/account/delete-request", { method: "POST" });
    setBusy(false);
    setDeleteState(res.ok ? "sent" : "error");
  }

  return (
    <>
      <section className="glass-card flex flex-col gap-4 px-5 py-5">
        <h2 className="text-sm font-medium text-text-primary">Partage</h2>

        <Toggle
          label="Rendre ma collection publique"
          hint="Une page en lecture seule, sans ton email ni tes informations personnelles."
          checked={share}
          onChange={toggleShare}
          disabled={busy}
        />

        {share && (
          <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-black/20 px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary">
              {publicUrl}
            </span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(publicUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              aria-label="Copier le lien"
              className="shrink-0 text-text-secondary hover:text-text-primary"
            >
              {copied ? <Check size={14} className="text-up" /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </section>

      <section className="glass-card flex flex-col gap-4 px-5 py-5">
        <h2 className="text-sm font-medium text-text-primary">Alertes de prix</h2>
        <Toggle
          label="M'avertir quand une carte prend de la valeur"
          hint={
            isPro
              ? "Les alertes démarreront dès que l'historique de prix sera suffisant."
              : "Réservé aux plans Pro."
          }
          checked={notify}
          onChange={toggleNotify}
          disabled={busy || !isPro}
        />
      </section>

      <section className="glass-card flex flex-col gap-3 px-5 py-5">
        <h2 className="text-sm font-medium text-text-primary">Supprimer mon compte</h2>
        <p className="text-xs text-text-secondary">
          Ta demande nous est envoyée par email et ton compte ainsi que toutes tes
          données sont supprimés manuellement sous quelques jours.
        </p>

        {deleteState === "sent" ? (
          <p className="text-sm text-up">
            Demande envoyée. Nous te confirmerons la suppression par email.
          </p>
        ) : deleteState === "confirm" ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={requestDeletion}
              disabled={busy}
              className="rounded-2xl bg-down px-4 py-2.5 text-sm font-medium text-[#1e1b4b] disabled:opacity-50"
            >
              Confirmer la demande
            </button>
            <button
              onClick={() => setDeleteState("idle")}
              className="rounded-2xl border border-glass-border px-4 py-2.5 text-sm text-text-secondary"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteState("confirm")}
            className="self-start text-sm text-down hover:underline"
          >
            Demander la suppression
          </button>
        )}

        {deleteState === "error" && (
          <p className="text-sm text-down">
            L&apos;envoi a échoué. Réessaie dans un instant.
          </p>
        )}
      </section>
    </>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start justify-between gap-4",
        disabled && "opacity-60",
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm text-text-primary">{label}</span>
        <span className="text-[11px] text-text-muted">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        disabled={disabled}
        className={cn(
          "mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-accent bg-accent/60" : "border-glass-border bg-white/10",
          disabled && "cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </label>
  );
}
