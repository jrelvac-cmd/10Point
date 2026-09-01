import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client service-role — bypass RLS. Réservé aux routes serveur de confiance
 * (webhooks, cron). Ne jamais exposer côté client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
