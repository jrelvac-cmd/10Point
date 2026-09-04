"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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

  // Message renvoyé par la page de retour d'authentification. Lu depuis
  // l'adresse plutôt qu'avec useSearchParams pour garder cette page en rendu
  // statique.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("error");
    if (reason === "lien_expire") {
      setError(
        "Ce lien de confirmation a expiré ou a déjà été utilisé. Connecte-toi ci-dessous, ou renvoie-toi un lien.",
      );
      setErrorKind("not_confirmed");
    } else if (reason === "auth") {
      setError("La connexion n'a pas abouti. Réessaie.");
      setErrorKind("generic");
    }
  }, []);

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

      // Supabase signale un compte existant de deux façons : par une erreur
      // explicite, ou — quand la protection contre l'énumération des emails est
      // active — par une réponse d'apparence normale mais sans identité liée.
      const alreadyExists =
        error?.code === "user_already_exists" ||
        error?.code === "email_exists" ||
        (!error && data.user !== null && (data.user.identities?.length ?? 0) === 0);

      if (alreadyExists) {
        // Le compte existe : plutôt que d'imposer un aller-retour vers l'écran
        // de connexion, on tente directement d'ouvrir la session avec le mot de
        // passe saisi. La bascule reste sûre : sans le bon mot de passe, rien ne
        // s'ouvre.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        setLoading(false);

        if (!signInError) {
          router.push("/home");
          router.refresh();
          return;
        }

        if (signInError.code === "email_not_confirmed") {
          const friendly = translateAuthError(signInError.code, signInError.message);
          setError(friendly.message);
          setErrorKind(friendly.kind);
          return;
        }

        setError(
          "Un compte existe déjà avec cet email, mais ce mot de passe ne correspond pas. Connecte-toi avec ton mot de passe habituel.",
        );
        setErrorKind("already_exists");
        return;
      }

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
          <h1 className="text-2xl font-bold text-text-primary">Vérifie ta boîte mail</h1>
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
            className="btn-secondary"
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
        <div className="flex items-center justify-center gap-2">
          <Image src="/icons/icon.svg" alt="" width={32} height={32} className="h-8 w-8" />
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">{APP_NAME}</h1>
        </div>

        <button
          onClick={handleGoogle}
          className="btn-secondary"
        >
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="h-px flex-1 bg-black/10" />
          ou
          <div className="h-px flex-1 bg-black/10" />
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
              className="field"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="field"
          />

          {notice && <p className="text-sm text-up">{notice}</p>}

          {error && (
            <div className="flex flex-col gap-2 rounded-xl border-l-2 border-l-down bg-black/5 px-3 py-2">
              <p className="text-sm text-text-primary">{error}</p>

              {errorKind === "not_confirmed" && (
                <button
                  type="button"
                  onClick={resendConfirmation}
                  disabled={loading}
                  className="self-start text-xs text-accent-dark hover:underline disabled:opacity-50"
                >
                  Renvoyer le lien de confirmation
                </button>
              )}

              {errorKind === "generic" && mode === "signin" && (
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="self-start text-xs text-accent-dark hover:underline"
                >
                  Créer un compte avec cet email
                </button>
              )}

              {errorKind === "already_exists" && (
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="self-start text-xs text-accent-dark hover:underline"
                >
                  Aller à la connexion
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
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
            className="rounded-full border border-dashed border-warn/60 px-4 py-3 text-sm font-medium text-warn transition-colors hover:bg-warn/10 disabled:opacity-50"
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
