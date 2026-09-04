import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractCardFromImage } from "@/lib/anthropic";
import { findCandidates, isUnambiguous, ebaySearchUrl, getSetInfo } from "@/lib/tcgdex";
import { cacheCardAndPrices } from "@/lib/cards";
import { canScan, remainingScans, type Plan } from "@/lib/plans";
import { resolvePrice, variation30d, extractPrices } from "@/lib/pricing";

export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedType = (typeof ALLOWED)[number];

function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED", "Connecte-toi pour scanner.", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, scans_this_month, scans_reset_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return fail("NO_PROFILE", "Profil introuvable.", 404);

  const admin = createAdminClient();

  // Remise à zéro du compteur mensuel si la période est passée.
  let scansThisMonth = profile.scans_this_month as number;
  if (new Date(profile.scans_reset_at) <= new Date()) {
    const nextReset = new Date();
    nextReset.setUTCMonth(nextReset.getUTCMonth() + 1, 1);
    nextReset.setUTCHours(0, 0, 0, 0);
    scansThisMonth = 0;
    await admin
      .from("profiles")
      .update({ scans_this_month: 0, scans_reset_at: nextReset.toISOString() })
      .eq("id", user.id);
  }

  const plan = profile.plan as Plan;
  if (!canScan(plan, scansThisMonth)) {
    return fail(
      "QUOTA_EXCEEDED",
      "Tu as utilisé tes 20 scans du mois. Passe Pro pour continuer.",
      402,
    );
  }

  // Le corps est lu en entier puis plafonné : on ne peut pas se fier à
  // Content-Length (absent en transfert par morceaux), et laisser formData()
  // échouer sur un envoi tronqué donnait une 500 illisible.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 64 * 1024) {
    return fail("TOO_LARGE", "Image trop lourde (max 10 Mo).", 413);
  }

  let formData: FormData;
  try {
    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_BYTES + 64 * 1024) {
      return fail("TOO_LARGE", "Image trop lourde (max 10 Mo).", 413);
    }
    formData = await new Response(raw, { headers: request.headers }).formData();
  } catch {
    return fail(
      "BAD_REQUEST",
      "Envoi invalide ou trop lourd. Réessaie avec une image JPG, PNG ou WEBP de moins de 10 Mo.",
    );
  }
  const file = formData.get("image");
  if (!(file instanceof File)) return fail("NO_IMAGE", "Aucune image reçue.");
  if (file.size > MAX_BYTES) return fail("TOO_LARGE", "Image trop lourde (max 10 Mo).");
  if (!ALLOWED.includes(file.type as AllowedType)) {
    return fail("BAD_FORMAT", "Formats acceptés : JPG, PNG, WEBP.");
  }

  // L'image n'est jamais stockée : elle vit uniquement le temps de la requête.
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  let extraction;
  try {
    extraction = await extractCardFromImage(base64, file.type as AllowedType);
  } catch {
    return fail(
      "VISION_FAILED",
      "Lecture de la carte impossible. Réessaie avec une photo plus nette.",
      502,
    );
  }

  if (!extraction.is_pokemon_card) {
    return fail("NOT_A_CARD", "Cette image ne semble pas être une carte Pokémon.");
  }

  let candidates;
  try {
    candidates = await findCandidates(extraction);
  } catch {
    return fail(
      "TCGDEX_FAILED",
      "Service d'identification indisponible. Réessaie dans un instant.",
      502,
    );
  }

  if (!candidates.length) {
    // Scan non abouti : il ne consomme pas de quota.
    return NextResponse.json(
      {
        error: "NO_MATCH",
        message: "Carte non reconnue. Cherche-la par son nom.",
        extraction,
      },
      { status: 404 },
    );
  }

  // Nom, numéro et total du set concordent sur un seul candidat : inutile de
  // faire choisir l'utilisateur.
  const certain = isUnambiguous(candidates, extraction);
  const shortlist = certain ? candidates.slice(0, 1) : candidates.slice(0, 5);

  // Seul le candidat affiché est écrit en base ; persister les autres
  // allongerait le scan pour rien. Ils sont mis en cache à l'ajout, si
  // l'utilisateur en choisit un.
  // Les infos de set (date, abréviation) partent en parallèle de la mise en cache.
  const [topPrices, setInfo] = await Promise.all([
    cacheCardAndPrices(shortlist[0]),
    shortlist[0].setId ? getSetInfo(shortlist[0].setId) : Promise.resolve({ releaseDate: null, abbreviation: null }),
  ]);

  const cards = shortlist.map((card, index) => {
    const prices = index === 0 ? topPrices : extractPrices(card);
    const normal = resolvePrice(prices, false);
    const reverse = resolvePrice(prices, true);
    return {
      id: card.id,
      name: card.name,
      set_name: card.setName,
      number: card.localId,
      set_printed_total: card.setPrintedTotal,
      rarity: card.rarity,
      types: card.types,
      // Les candidats d'un autre set n'ont pas leurs infos : un seul appel suffit
      // pour le cas courant, et la page reste juste.
      set_code: card.setId === shortlist[0].setId ? setInfo.abbreviation : null,
      release_date: card.setId === shortlist[0].setId ? setInfo.releaseDate : null,
      image_small: card.imageSmall,
      image_large: card.imageLarge,
      // Permet de n'afficher que les cases des variantes qui existent vraiment.
      variants: card.variants,
      ebay_url: ebaySearchUrl(card),
      prices: {
        normal: { ...normal, variation_30d: variation30d(normal.trend, normal.avg30) },
        reverse: { ...reverse, variation_30d: variation30d(reverse.trend, reverse.avg30) },
      },
    };
  });

  // Scan abouti : on décompte le quota et on journalise.
  await admin
    .from("profiles")
    .update({ scans_this_month: scansThisMonth + 1 })
    .eq("id", user.id);

  await admin.from("scan_logs").insert({
    user_id: user.id,
    card_id: cards.length === 1 ? cards[0].id : null,
  });

  return NextResponse.json({
    confirmed: cards.length === 1,
    cards,
    extraction,
    remaining_scans: remainingScans(plan, scansThisMonth + 1),
  });
}
