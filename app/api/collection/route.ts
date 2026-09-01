import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAddCard, type Plan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCardById } from "@/lib/poketcg";
import { cacheCardAndPrices } from "@/lib/cards";

/**
 * Le scan ne persiste que le candidat affiché, pour rester rapide. Si
 * l'utilisateur en choisit un autre, la carte n'est pas encore au référentiel :
 * on l'y met ici, faute de quoi la clé étrangère rejetterait l'ajout.
 */
async function ensureCardCached(cardId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pokemon_cards")
    .select("id")
    .eq("id", cardId)
    .maybeSingle();
  if (data) return true;

  const card = await getCardById(cardId).catch(() => null);
  if (!card) return false;

  await cacheCardAndPrices(card);
  return true;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const cardId = typeof body?.card_id === "string" ? body.card_id : null;
  const quantity = Number.isInteger(body?.quantity) ? Number(body.quantity) : 1;
  const isHolo = Boolean(body?.is_holo);
  const isReverse = Boolean(body?.is_reverse);

  if (!cardId) {
    return NextResponse.json({ error: "MISSING_CARD_ID" }, { status: 400 });
  }
  if (quantity < 1 || quantity > 99) {
    return NextResponse.json({ error: "BAD_QUANTITY" }, { status: 400 });
  }

  if (!(await ensureCardCached(cardId))) {
    return NextResponse.json({ error: "CARD_NOT_FOUND" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile?.plan ?? "free") as Plan;

  const { data: existing } = await supabase
    .from("collection_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .eq("is_holo", isHolo)
    .eq("is_reverse", isReverse)
    .maybeSingle();

  if (existing) {
    const newQuantity = Math.min(99, existing.quantity + quantity);
    const { error } = await supabase
      .from("collection_items")
      .update({ quantity: newQuantity })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: existing.id, quantity: newQuantity });
  }

  // La limite Free porte sur le nombre de lignes distinctes, pas sur les exemplaires.
  const { count } = await supabase
    .from("collection_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!canAddCard(plan, count ?? 0)) {
    return NextResponse.json(
      {
        error: "COLLECTION_LIMIT",
        message: "Ta collection Free est limitée à 100 cartes. Passe Pro pour continuer.",
      },
      { status: 402 },
    );
  }

  const { data, error } = await supabase
    .from("collection_items")
    .insert({
      user_id: user.id,
      card_id: cardId,
      quantity,
      is_holo: isHolo,
      is_reverse: isReverse,
    })
    .select("id, quantity")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
