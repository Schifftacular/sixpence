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

/** Signed in and allowed to edit this wedding, or an error message. */
type Editor = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string };
export async function editor(weddingId: string): Promise<Editor | { error: string }> {
  const { supabase, userId } = await actor();
  if (!userId) return { error: "Please sign in." };
  if (!(await canEdit(supabase, weddingId))) return { error: "You can view this wedding but not change it." };
  return { supabase, userId };
}

export async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  weddingId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  diff?: Record<string, unknown>,
) {
  await supabase.rpc("log_activity", { w: weddingId, p_action: action, p_entity_type: entityType, p_entity_id: entityId, p_diff: diff ?? null });
}
