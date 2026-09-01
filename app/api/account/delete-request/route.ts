import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/constants";

/**
 * Envoie la demande de suppression à l'adresse d'administration. Le traitement
 * est manuel pour le MVP : c'est plus lent qu'une suppression automatique, mais
 * cela évite qu'un clic malencontreux détruise une collection sans retour.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.error("[compte] suppression demandée mais l'envoi d'email n'est pas configuré", {
      userId: user.id,
    });
    return NextResponse.json({ error: "EMAIL_NOT_CONFIGURED" }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, plan")
    .eq("id", user.id)
    .maybeSingle();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `[${APP_NAME}] Demande de suppression de compte`,
      text: [
        "Un utilisateur demande la suppression de son compte.",
        "",
        `Identifiant : ${user.id}`,
        `Email      : ${user.email ?? "—"}`,
        `Pseudo     : ${profile?.username ?? "—"}`,
        `Plan       : ${profile?.plan ?? "free"}`,
        `Demandé le : ${new Date().toISOString()}`,
        "",
        "Pense à résilier son abonnement Whop avant de supprimer le compte.",
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    console.error(`[compte] envoi de la demande échoué : HTTP ${res.status}`);
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
