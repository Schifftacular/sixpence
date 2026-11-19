"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignIn({ disabled }: { disabled?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={disabled || busy}
      className="inline-flex items-center justify-center gap-2 rounded-pill border border-border bg-surface px-5 py-3 text-sm font-medium text-text shadow-sm transition hover:bg-primary-soft disabled:opacity-60"
    >
      {busy ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}
