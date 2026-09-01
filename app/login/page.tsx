"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME, APP_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${APP_URL}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      setLoading(false);
      if (error) return setError(error.message);

      if (data.session) {
        router.push("/home");
        router.refresh();
        return;
      }

      setCheckEmail(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/home");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="glass-card-strong flex w-full max-w-sm flex-col gap-3 px-6 py-8 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Vérifie ta boîte mail</h1>
          <p className="text-sm text-text-secondary">
            Un lien de confirmation a été envoyé à <span className="text-text-primary">{email}</span>.
            Clique dessus pour activer ton compte, puis reviens te connecter ici.
          </p>
          <button
            onClick={() => {
              setCheckEmail(false);
              setMode("signin");
            }}
            className="mt-2 text-center text-xs text-text-secondary hover:text-text-primary"
          >
            Retour à la connexion
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="glass-card-strong flex w-full max-w-sm flex-col gap-4 px-6 py-8">
        <h1 className="text-center text-xl font-semibold text-text-primary">{APP_NAME}</h1>

        <button
          onClick={handleGoogle}
          className="glass-card px-4 py-3 text-sm font-medium text-text-primary hover:bg-white/15 transition-colors"
        >
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="h-px flex-1 bg-white/10" />
          ou
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={24}
              pattern="[a-z0-9_]+"
              className="glass-card bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="glass-card bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="glass-card bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
          />

          {error && <p className="text-sm text-down">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-center text-xs text-text-secondary hover:text-text-primary"
        >
          {mode === "signin" ? "Pas encore de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
        </button>
      </div>
    </main>
  );
}
