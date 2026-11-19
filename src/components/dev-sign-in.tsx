"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Local development only: email + password against the local auth server, so flows can be tested without Google.
// Compiled out of production builds (NODE_ENV) and hidden unless NEXT_PUBLIC_DEV_EMAIL_LOGIN=1.
export const devLoginEnabled = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEV_EMAIL_LOGIN === "1";

export function DevSignIn({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!devLoginEnabled) return null;
  async function go(fd: FormData) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const email = String(fd.get("email")), password = String(fd.get("password"));
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) ({ error } = await supabase.auth.signUp({ email, password }));
    setBusy(false);
    if (error) return setError(error.message);
    window.location.assign(next ?? "/");
  }
  return (
    <form action={go} className="mt-4 flex flex-col gap-2 rounded-md border border-dashed border-border p-3 text-left text-sm">
      <p className="text-xs text-text-muted">Developer sign-in (local only)</p>
      <input className="input" name="email" type="email" required placeholder="dev@example.test" aria-label="Email" />
      <input className="input" name="password" type="password" required minLength={6} placeholder="password" aria-label="Password" />
      {error && <p className="text-danger">{error}</p>}
      <button className="btn btn-secondary btn-sm" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
