import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Plan } from "./plans";

export type Profile = {
  username: string | null;
  username_set: boolean;
  plan: Plan;
  plan_expires_at: string | null;
  whop_membership_id: string | null;
  share_collection: boolean;
  notify_price_change: boolean;
  scans_this_month: number;
};

/**
 * Profil de l'utilisateur, lu une seule fois par requête.
 *
 * Le layout en avait besoin pour la barre du haut, la page pour son contenu :
 * deux lectures identiques à chaque navigation. `cache` de React les fusionne ;
 * on lit toutes les colonnes utiles d'un coup plutôt qu'un sous-ensemble par
 * appelant, une ligne de profil restant minuscule.
 */
export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "username, username_set, plan, plan_expires_at, whop_membership_id, share_collection, notify_price_change, scans_this_month",
    )
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});
