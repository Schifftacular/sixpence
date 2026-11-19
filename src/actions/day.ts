"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { editor, fail, logActivity, ok, type ActionResult } from "@/lib/actions";
import { draftDay } from "@/lib/plan/day";

const Time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

export async function saveEvent(input: unknown): Promise<ActionResult> {
  const p = z.object({ weddingId: z.uuid(), eventId: z.uuid().optional(), startsAt: Time, endsAt: Time.optional().or(z.literal("").transform(() => undefined)), title: z.string().trim().min(1).max(200), location: opt(200), owner: opt(200) }).safeParse(input);
  if (!p.success) return fail("Add a time and what happens.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const d = p.data;
  const row = { wedding_id: d.weddingId, starts_at: d.startsAt, ends_at: d.endsAt ?? null, title: d.title, location: d.location, owner: d.owner };
  const { error } = d.eventId
    ? await g.supabase.from("timeline_event").update(row).eq("id", d.eventId).eq("wedding_id", d.weddingId)
    : await g.supabase.from("timeline_event").insert(row);
  if (error) return fail("We couldn't save that. Please try again.");
  await logActivity(g.supabase, d.weddingId, "timeline.changed", "wedding", d.weddingId);
  refresh();
  return ok(null);
}

export async function removeEvent(input: unknown): Promise<ActionResult> {
  const p = z.object({ eventId: z.uuid() }).safeParse(input);
  if (!p.success) return fail("Something went wrong.");
  const supabase = await createClient();
  const { data: e } = await supabase.from("timeline_event").select("id,wedding_id").eq("id", p.data.eventId).maybeSingle();
  if (!e) return fail("That's already gone.");
  const g = await editor(e.wedding_id as string);
  if ("error" in g) return fail(g.error);
  await g.supabase.from("timeline_event").delete().eq("id", e.id);
  refresh();
  return ok(null);
}

/** Build a draft from the ceremony time and booked vendors. Replaces the timeline only when asked. */
export async function draftTimeline(input: unknown): Promise<ActionResult> {
  const p = z.object({ weddingId: z.uuid(), ceremonyTime: Time, replace: z.boolean().default(false) }).safeParse(input);
  if (!p.success) return fail("Add your ceremony time first.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const { weddingId, ceremonyTime, replace } = p.data;
  const { count } = await g.supabase.from("timeline_event").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId);
  if ((count ?? 0) > 0 && !replace) return fail("You already have a timeline.");
  const { data: vendors } = await g.supabase.from("vendor").select("id,name,category_key,arrival_time").eq("wedding_id", weddingId).eq("status", "booked");
  const events = draftDay(ceremonyTime.slice(0, 5), (vendors ?? []) as { id: string; name: string; category_key: string; arrival_time: string | null }[]);
  if (replace) await g.supabase.from("timeline_event").delete().eq("wedding_id", weddingId);
  await g.supabase.from("wedding").update({ ceremony_time: ceremonyTime }).eq("id", weddingId);
  const { error } = await g.supabase.from("timeline_event").insert(events.map((e, i) => ({
    wedding_id: weddingId, starts_at: e.startsAt, ends_at: e.endsAt ?? null, title: e.title, owner: e.owner ?? null, vendor_id: e.vendorId ?? null, sort: i,
  })));
  if (error) return fail("We couldn't build the draft. Please try again.");
  await logActivity(g.supabase, weddingId, "timeline.changed", "wedding", weddingId, { drafted: events.length });
  refresh();
  return ok(null);
}
