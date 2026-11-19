"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { actor, fail, logActivity, ok, type ActionResult } from "@/lib/actions";

// Together: invite a partner, family helping pay, or someone to look but not change.
// The link is copied and shared by the couple. We don't email anyone.
export async function createInvite(input: unknown): Promise<ActionResult<{ token: string }>> {
  const p = z.object({ weddingId: z.uuid(), role: z.enum(["collaborator", "funder", "viewer"]), label: z.string().trim().max(60).optional() }).safeParse(input);
  if (!p.success) return fail("Pick what they can do.");
  const { supabase, userId } = await actor();
  if (!userId) return fail("Please sign in.");
  const { data: me } = await supabase.from("wedding_member").select("role").eq("wedding_id", p.data.weddingId).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!me || !["owner", "collaborator"].includes(me.role as string)) return fail("Only the couple can invite people.");
  const { data, error } = await supabase.from("invite").insert({ wedding_id: p.data.weddingId, role: p.data.role, label: p.data.label || null, created_by: userId }).select("id,token").single();
  if (error || !data) return fail("We couldn't make a link. Please try again.");
  await logActivity(supabase, p.data.weddingId, "invite.created", "wedding", p.data.weddingId, { role: p.data.role });
  refresh();
  return ok({ token: data.token as string });
}

export async function revokeInvite(input: unknown): Promise<ActionResult> {
  const p = z.object({ inviteId: z.uuid() }).safeParse(input);
  if (!p.success) return fail("Something went wrong.");
  const { supabase, userId } = await actor();
  if (!userId) return fail("Please sign in.");
  const { error } = await supabase.from("invite").delete().eq("id", p.data.inviteId).is("accepted_at", null);
  if (error) return fail("We couldn't cancel that link.");
  refresh();
  return ok(null);
}

export async function acceptInvite(input: unknown): Promise<ActionResult<{ weddingId: string }>> {
  const p = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(input);
  if (!p.success) return fail("This invite link isn't valid.");
  const { supabase, userId } = await actor();
  if (!userId) return fail("Please sign in first.");
  const { data, error } = await supabase.rpc("accept_invite", { p_token: p.data.token });
  if (error || !data) return fail(error?.message.includes("expired") ? "This invite has expired. Ask for a new link." : "This invite was already used.");
  return ok({ weddingId: data as string });
}
