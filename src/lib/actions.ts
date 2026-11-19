import "server-only";
import { createClient } from "@/lib/supabase/server";

// Shared pieces for src/actions/*. Every write: zod parse → permission check → write → activity row.
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** Signed-in Supabase client plus the caller's user id, or null when signed out. */
export async function actor() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  return { supabase, userId };
}

/** RLS is the boundary; this check gives a clear error before the write instead of a silent no-op. */
export async function canEdit(supabase: Awaited<ReturnType<typeof createClient>>, weddingId: string) {
  const { data } = await supabase.rpc("can_edit", { w: weddingId });
  return data === true;
}
