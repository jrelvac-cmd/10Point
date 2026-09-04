"use client";

import { useState, useTransition } from "react";
import { setUsername } from "./actions";

export function UsernameForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await setUsername(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        name="username"
        placeholder="mon_pseudo"
        required
        minLength={3}
        maxLength={24}
        pattern="[a-z0-9_]+"
        className="field"
      />
      {error && <p className="text-sm text-down">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary"
      >
        Valider
      </button>
    </form>
  );
}
