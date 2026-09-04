import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron-auth";
import { isPro, type Plan } from "@/lib/plans";
import { formatEur } from "@/lib/pricing";
import { APP_NAME, APP_URL } from "@/lib/constants";

export const maxDuration = 60;

/**
 * Alertes de hausse de prix (réservées aux comptes payants qui les ont
 * activées). Le code est livré « dormant » : il ne se déclenche que lorsque
 * notre propre historique contient une cote de référence assez ancienne, et
 * que l'envoi d'email est configuré. Au plus un email par carte et par
 * semaine, toutes les hausses d'un même utilisateur regroupées en un message.
 */
const MIN_BASELINE_AGE_DAYS = 3;
const MAX_BASELINE_AGE_DAYS = 30;
const RESEND_COOLDOWN_DAYS = 7;

function thresholdRatio(setting: string | null): number {
  switch ((setting ?? "").replace("×", "x").toLowerCase()) {
    case "+20%":
      return 0.2;
    case "x2":
      return 1.0;
    default:
      return 0.5; // "+50%", valeur par défaut
  }
}

type Owned = {
  user_id: string;
  card_id: string;
  is_reverse: boolean;
  profiles: { plan: string; notify_price_change: boolean; notify_threshold: string | null };
  pokemon_cards: { name: string; set_name: string | null; number: string | null };
};

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return NextResponse.json({ dormant: true, reason: "EMAIL_NOT_CONFIGURED" }, { status: 503 });
  }

  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("collection_items")
    .select(
      "user_id, card_id, is_reverse, profiles!inner(plan, notify_price_change, notify_threshold), pokemon_cards!inner(name, set_name, number)",
    )
    .eq("profiles.notify_price_change", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const owned = ((rows ?? []) as unknown as Owned[]).filter((r) =>
    isPro(r.profiles.plan as Plan),
  );
  if (!owned.length) return NextResponse.json({ candidates: 0, emails: 0 });

  const cardIds = [...new Set(owned.map((r) => r.card_id))];

  const [{ data: prices }, { data: history }, { data: sent }] = await Promise.all([
    admin.from("card_prices").select("card_id, trend, reverse_trend").in("card_id", cardIds),
    admin
      .from("price_history")
      .select("card_id, trend, reverse_trend, snapshot_date")
      .in("card_id", cardIds)
      .gte(
        "snapshot_date",
        new Date(Date.now() - MAX_BASELINE_AGE_DAYS * 86400e3).toISOString().slice(0, 10),
      )
      .lte(
        "snapshot_date",
        new Date(Date.now() - MIN_BASELINE_AGE_DAYS * 86400e3).toISOString().slice(0, 10),
      )
      .order("snapshot_date", { ascending: true }),
    admin
      .from("price_alerts_sent")
      .select("user_id, card_id")
      .gte("sent_at", new Date(Date.now() - RESEND_COOLDOWN_DAYS * 86400e3).toISOString()),
  ]);

  const current = new Map((prices ?? []).map((p) => [p.card_id as string, p]));
  // Référence = plus ancien relevé dans la fenêtre : la hausse se mesure sur
  // la durée, pas d'un jour à l'autre.
  const baseline = new Map<string, { trend: number | null; reverse_trend: number | null }>();
  for (const h of history ?? []) {
    if (!baseline.has(h.card_id as string)) baseline.set(h.card_id as string, h);
  }
  const recentlySent = new Set((sent ?? []).map((s) => `${s.user_id}:${s.card_id}`));

  type Alert = { cardId: string; name: string; set: string; oldPrice: number; newPrice: number; pct: number };
  const perUser = new Map<string, Alert[]>();

  for (const row of owned) {
    if (recentlySent.has(`${row.user_id}:${row.card_id}`)) continue;
    const now = current.get(row.card_id);
    const then = baseline.get(row.card_id);
    if (!now || !then) continue;

    const newPrice = row.is_reverse ? now.reverse_trend : now.trend;
    const oldPrice = row.is_reverse ? then.reverse_trend : then.trend;
    if (!newPrice || !oldPrice || oldPrice <= 0) continue;

    const ratio = (newPrice - oldPrice) / oldPrice;
    if (ratio < thresholdRatio(row.profiles.notify_threshold)) continue;

    const list = perUser.get(row.user_id) ?? [];
    if (list.some((a) => a.cardId === row.card_id)) continue;
    list.push({
      cardId: row.card_id,
      name: row.pokemon_cards.name,
      set: row.pokemon_cards.set_name ?? "",
      oldPrice,
      newPrice,
      pct: Math.round(ratio * 1000) / 10,
    });
    perUser.set(row.user_id, list);
  }

  let emails = 0;
  let failed = 0;

  for (const [userId, alerts] of perUser) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const to = userData?.user?.email;
    if (!to) continue;

    const lines = alerts.map(
      (a) =>
        `• ${a.name}${a.set ? ` (${a.set})` : ""} : ${formatEur(a.oldPrice)} → ${formatEur(a.newPrice)} (+${a.pct} %)`,
    );

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject:
          alerts.length === 1
            ? `${alerts[0].name} a pris +${alerts[0].pct} %`
            : `${alerts.length} de tes cartes ont pris de la valeur`,
        text: [
          `Bonne nouvelle : ${alerts.length === 1 ? "une de tes cartes monte" : "plusieurs de tes cartes montent"}.`,
          "",
          ...lines,
          "",
          `Voir ma collection : ${APP_URL}/collection`,
          "",
          `Tu peux désactiver ces alertes dans tes paramètres : ${APP_URL}/parametres`,
          `— ${APP_NAME}`,
        ].join("\n"),
      }),
    });

    if (!res.ok) {
      failed++;
      continue;
    }
    emails++;
    await admin.from("price_alerts_sent").insert(
      alerts.map((a) => ({
        user_id: userId,
        card_id: a.cardId,
        old_price: a.oldPrice,
        new_price: a.newPrice,
      })),
    );
  }

  return NextResponse.json({ candidates: owned.length, users: perUser.size, emails, failed });
}
