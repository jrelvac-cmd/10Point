"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export async function setUsername(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    return { error: "3 à 24 caractères : lettres minuscules, chiffres, underscore." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ username, username_set: true })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "Ce nom d'utilisateur est déjà pris." };
    return { error: "Une erreur est survenue, réessaie." };
  }

  redirect("/home");
}
