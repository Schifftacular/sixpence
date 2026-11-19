"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { editor, fail, logActivity, ok, type ActionResult } from "@/lib/actions";
import { geocode, type GeoResult } from "@/lib/geo";
import { reflowDue } from "@/lib/plan/reflow";
import { todayIso } from "@/lib/today";

export async function searchLocation(input: unknown): Promise<ActionResult<GeoResult[]>> {
  const p = z.object({ q: z.string().trim().min(2).max(100) }).safeParse(input);
  if (!p.success) return ok([]);
  const r = await geocode(p.data.q);
  if (r === null) return fail("Place search isn't available right now. You can still save the name.");
  return ok(r);
}

/** Edit the basics. A new date moves every open planned task by the same amount. */
export async function updateWedding(input: unknown): Promise<ActionResult<{ moved: number }>> {
  const p = z.object({
    weddingId: z.uuid(),
    name: z.string().trim().min(1).max(120),
    date: z.iso.date().nullable(),
    dateIsEstimate: z.boolean(),
    locationText: z.string().trim().max(200).nullable(),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    guests: z.coerce.number().int().min(1).max(1000).nullable(),
    guestsIsEstimate: z.boolean(),
    ceremonyTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  }).safeParse(input);
  if (!p.success) return fail("Something was off in those details.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const d = p.data;
  const { data: before } = await g.supabase.from("wedding").select("date").eq("id", d.weddingId).single();
  const { error } = await g.supabase.from("wedding").update({
    name: d.name, date: d.date, date_is_estimate: d.dateIsEstimate, location_text: d.locationText, lat: d.lat, lng: d.lng,
    guest_estimate: d.guests, guest_estimate_is_estimate: d.guestsIsEstimate, ceremony_time: d.ceremonyTime,
  }).eq("id", d.weddingId);
  if (error) return fail("We couldn't save that. Please try again.");

  let moved = 0;
  if (d.date && d.date !== before?.date) {
    const today = todayIso();
    const { data: tasks } = await g.supabase.from("task").select("id,due_offset_days").eq("wedding_id", d.weddingId).eq("status", "todo").not("due_offset_days", "is", null);
    for (const t of tasks ?? []) {
      await g.supabase.from("task").update({ due_date: reflowDue(d.date, Number(t.due_offset_days), today) }).eq("id", t.id);
      moved++;
    }
  }
  await logActivity(g.supabase, d.weddingId, "wedding.updated", "wedding", d.weddingId, { dateChanged: d.date !== before?.date });
  refresh();
  return ok({ moved });
}

/** Welcome survey after the first save: names, where, how far along, what matters most. */
export async function saveWelcome(input: unknown): Promise<ActionResult> {
  const p = z.object({
    weddingId: z.uuid(),
    name: z.string().trim().min(1).max(120),
    locationText: z.string().trim().max(200).nullable(),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    stage: z.enum(["just_engaged", "venue_booked", "some_vendors", "final_stretch"]),
    priorities: z.array(z.enum(["food", "photos", "music", "venue", "attire", "guest_experience"])).max(3),
    displayName: z.string().trim().max(60).optional(),
  }).safeParse(input);
  if (!p.success) return fail("Something was off in those answers.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const d = p.data;
  await g.supabase.from("wedding").update({ name: d.name, location_text: d.locationText, lat: d.lat, lng: d.lng, planning_stage: d.stage, priorities: d.priorities }).eq("id", d.weddingId);
  if (d.displayName) await g.supabase.from("wedding_member").update({ display_name: d.displayName }).eq("wedding_id", d.weddingId).eq("user_id", g.userId);
  // Tasks already behind them at this stage start as done.
  const { TASKS } = await import("@/lib/plan/templates");
  const done = TASKS.filter((t) => t.doneFrom?.includes(d.stage)).map((t) => t.key);
  if (done.length) await g.supabase.from("task").update({ status: "done" }).eq("wedding_id", d.weddingId).eq("status", "todo").in("template_key", done);
  await logActivity(g.supabase, d.weddingId, "wedding.updated", "wedding", d.weddingId, { welcome: true });
  refresh();
  return ok(null);
}
