import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPro, type Plan } from "@/lib/plans";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const patch: Record<string, boolean> = {};

  if (typeof body?.share_collection === "boolean") {
    patch.share_collection = body.share_collection;
  }

  if (typeof body?.notify_price_change === "boolean") {
    // Les alertes sont réservées aux plans payants : la vérification se fait
    // ici, côté serveur, car un contrôle d'interface se contourne.
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    if (!isPro((profile?.plan ?? "free") as Plan)) {
      return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 402 });
    }
    patch.notify_price_change = body.notify_price_change;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "NOTHING_TO_UPDATE" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
