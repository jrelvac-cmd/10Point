import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const quantity = Number(body?.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return NextResponse.json({ error: "BAD_QUANTITY" }, { status: 400 });
  }

  // La policy RLS "own collection" garantit qu'on ne touche que ses propres lignes.
  const { data, error } = await supabase
    .from("collection_items")
    .update({ quantity })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, quantity")
    .maybeSingle();

  if (error) {
    console.error(`[api] ${error.code ?? "?"} ${error.message}`);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  // Avec les règles RLS, supprimer la ligne d'un autre compte n'est pas une
  // erreur : zéro ligne touchée. On le distingue d'une vraie suppression.
  const { data, error } = await supabase
    .from("collection_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    console.error(`[api] ${error.code ?? "?"} ${error.message}`);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
