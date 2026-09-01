import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Connexion de démonstration — permet de parcourir l'app sans inscription.
 *
 * Garde-fou : la route ne répond que si ENABLE_DEMO_LOGIN vaut "true".
 * Cette variable n'existe que dans .env.local, jamais dans les variables
 * d'environnement Vercel : le bypass ne peut donc pas se retrouver actif en
 * production par oubli. Le compte démo est un utilisateur Supabase normal,
 * soumis aux mêmes politiques RLS que les autres.
 */
const DEMO_EMAIL = "demo@tenpoint.app";
const DEMO_PASSWORD = "demo-tenpoint-local-only";
const DEMO_USERNAME = "demo";

export async function POST() {
  if (process.env.ENABLE_DEMO_LOGIN !== "true") {
    return NextResponse.json({ error: "DEMO_DISABLED" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { username: DEMO_USERNAME },
  });

  let userId = created?.user?.id;

  // Déjà créé lors d'un passage précédent : on récupère l'identifiant et on
  // réaligne le mot de passe pour que la connexion aboutisse à coup sûr.
  if (error) {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === DEMO_EMAIL);
    if (!existing) {
      return NextResponse.json({ error: "DEMO_SETUP_FAILED" }, { status: 500 });
    }
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
  }

  // Le pseudo est déjà choisi : on évite la redirection vers /choisir-pseudo.
  if (userId) {
    await admin
      .from("profiles")
      .update({ username: DEMO_USERNAME, username_set: true })
      .eq("id", userId);
  }

  return NextResponse.json({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
}
