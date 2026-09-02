"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME, APP_URL } from "@/lib/constants";
import { translateAuthError, type AuthErrorKind } from "@/lib/auth-errors";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<AuthErrorKind>("generic");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  /** Bypass de dev : entre dans l'app avec un compte de démonstration. */
  async function handleDemo() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/demo-login", { method: "POST" });
    if (!res.ok) {
      setLoading(false);
      setError("Le mode démo n'est pas activé sur cet environnement.");
      setErrorKind("generic");
      return;
    }

    const { email: demoEmail, password: demoPassword } = await res.json();
    const { error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      setErrorKind("generic");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${APP_URL}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setErrorKind("generic");
    }
  }

  /** Renvoie le lien de confirmation quand le premier mail n'est pas arrivé. */
  async function resendConfirmation() {
    if (!email) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${APP_URL}/auth/callback` },
    });
    setLoading(false);

    if (error) {
      const friendly = translateAuthError(error.code, error.message);
      setError(friendly.message);
      setErrorKind(friendly.kind);
      return;
    }
    setNotice(`Nouveau lien envoyé à ${email}. Pense à regarder dans les spams.`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${APP_URL}/auth/callback`,
        },
      });
      setLoading(false);

      if (error) {
        const friendly = translateAuthError(error.code, error.message);
        setError(friendly.message);
        setErrorKind(friendly.kind);
        return;
      }

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

    if (error) {
      const friendly = translateAuthError(error.code, error.message);
      setError(friendly.message);
      setErrorKind(friendly.kind);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="glass-card-strong flex w-full max-w-sm flex-col gap-3 px-6 py-8 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Vérifie ta boîte mail</h1>
          <p className="text-sm text-text-secondary">
            Un lien de confirmation a été envoyé à{" "}
            <span className="text-text-primary">{email}</span>. Clique dessus pour activer
            ton compte, puis reviens te connecter ici.
          </p>
          <p className="text-xs text-text-muted">
            Rien reçu au bout de deux minutes ? Regarde dans les spams, puis renvoie le lien.
          </p>

          {notice && <p className="text-sm text-up">{notice}</p>}
          {error && <p className="text-sm text-down">{error}</p>}

          <button
            onClick={resendConfirmation}
            disabled={loading}
            className="glass-card px-4 py-3 text-sm text-text-primary hover:bg-white/15 disabled:opacity-50"
          >
            Renvoyer le lien
          </button>
          <button
            onClick={() => {
              setCheckEmail(false);
              switchMode("signin");
            }}
            className="text-xs text-text-secondary hover:text-text-primary"
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
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              minLength={3}
              maxLength={24}
              pattern="[a-z0-9_]+"
              title="3 à 24 caractères : minuscules, chiffres et underscore"
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

          {notice && <p className="text-sm text-up">{notice}</p>}

          {error && (
            <div className="flex flex-col gap-2 rounded-xl border-l-2 border-l-down bg-white/5 px-3 py-2">
              <p className="text-sm text-text-primary">{error}</p>

              {errorKind === "not_confirmed" && (
                <button
                  type="button"
                  onClick={resendConfirmation}
                  disabled={loading}
                  className="self-start text-xs text-accent-light hover:underline disabled:opacity-50"
                >
                  Renvoyer le lien de confirmation
                </button>
              )}

              {errorKind === "generic" && mode === "signin" && (
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="self-start text-xs text-accent-light hover:underline"
                >
                  Créer un compte avec cet email
                </button>
              )}

              {errorKind === "already_exists" && (
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="self-start text-xs text-accent-light hover:underline"
                >
                  Aller à la connexion
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {loading
              ? "Un instant…"
              : mode === "signin"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>
        </form>

        {process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" && (
          <button
            onClick={handleDemo}
            disabled={loading}
            className="rounded-2xl border border-dashed border-warn/50 px-4 py-3 text-sm text-warn transition-colors hover:bg-warn/10 disabled:opacity-50"
          >
            Entrer en mode démo (sans compte)
          </button>
        )}

        <button
          onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          className="text-center text-xs text-text-secondary hover:text-text-primary"
        >
          {mode === "signin"
            ? "Pas encore de compte ? Inscris-toi"
            : "Déjà un compte ? Connecte-toi"}
        </button>
      </div>
    </main>
  );
}
