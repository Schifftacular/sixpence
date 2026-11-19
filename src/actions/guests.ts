"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { editor, fail, logActivity, ok, type ActionResult } from "@/lib/actions";
import { parseList } from "@/lib/guests/parse";
import { createClient } from "@/lib/supabase/server";

// Guests (F6). Invitations go to households. RSVP links stay off until sending is turned on.
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

/** Quick add or paste: one household per line. */
export async function addHouseholds(input: unknown): Promise<ActionResult<{ count: number }>> {
  const p = z.object({ weddingId: z.uuid(), text: z.string().max(50_000), side: opt(40), group: opt(80) }).safeParse(input);
  if (!p.success) return fail("Type at least one name.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const list = parseList(p.data.text);
  if (!list.length) return fail("Type at least one name.");
  const { data: rows, error } = await g.supabase.from("household").insert(list.map((h) => ({
    wedding_id: p.data.weddingId, name: h.name, side: p.data.side, group_name: p.data.group, plus_one_allowed: h.plusOneAllowed,
  }))).select("id");
  if (error || !rows) return fail("We couldn't add those. Please try again.");
  const guests = rows.flatMap((r, i) => list[i].guests.map((x, j) => ({
    wedding_id: p.data.weddingId, household_id: r.id, first_name: x.firstName, last_name: x.lastName, is_child: x.isChild, is_plus_one: x.isPlusOne, sort: j,
  })));
  const { error: gErr } = await g.supabase.from("guest").insert(guests);
  if (gErr) return fail("We added the households but not everyone in them. Please check the list.");
  await logActivity(g.supabase, p.data.weddingId, "household.added", "wedding", p.data.weddingId, { count: rows.length });
  refresh();
  return ok({ count: rows.length });
}

async function householdFor(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("household").select("id,wedding_id").eq("id", id).maybeSingle();
  return data as { id: string; wedding_id: string } | null;
}

const GuestIn = z.object({
  id: z.uuid().optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: opt(80),
  isChild: z.boolean().default(false),
  isPlusOne: z.boolean().default(false),
  attending: z.boolean().nullable().default(null),
  meal: opt(80),
  dietary: opt(200),
});

/** Edit a household and everyone in it, including RSVPs you heard in person. */
export async function saveHousehold(input: unknown): Promise<ActionResult> {
  const p = z.object({
    householdId: z.uuid(), name: z.string().trim().min(1).max(200), side: opt(40), group: opt(80), email: z.union([z.email().max(200), z.literal("")]).optional(),
    address: opt(400), plusOneAllowed: z.boolean().default(false), note: opt(1000), guests: z.array(GuestIn).min(1).max(30),
  }).safeParse(input);
  if (!p.success) return fail(p.error.issues.some((i) => i.path[0] === "email") ? "That email doesn't look right." : "Every guest needs a first name.");
  const h = await householdFor(p.data.householdId);
  if (!h) return fail("We couldn't find that household.");
  const g = await editor(h.wedding_id);
  if ("error" in g) return fail(g.error);
  const d = p.data;
  const anyAnswer = d.guests.some((x) => x.attending !== null);
  const { data: before } = await g.supabase.from("household").select("responded_at").eq("id", h.id).single();
  await g.supabase.from("household").update({
    name: d.name, side: d.side, group_name: d.group, email: d.email || null, address: d.address, plus_one_allowed: d.plusOneAllowed, note: d.note,
    responded_at: anyAnswer ? before?.responded_at ?? new Date().toISOString() : null,
  }).eq("id", h.id);
  const keep = d.guests.filter((x) => x.id).map((x) => x.id!);
  const { data: existing } = await g.supabase.from("guest").select("id").eq("household_id", h.id);
  const remove = (existing ?? []).map((e) => e.id as string).filter((id) => !keep.includes(id));
  if (remove.length) await g.supabase.from("guest").delete().in("id", remove);
  for (const [i, x] of d.guests.entries()) {
    const row = { first_name: x.firstName, last_name: x.lastName, is_child: x.isChild, is_plus_one: x.isPlusOne, attending: x.attending, meal: x.meal, dietary: x.dietary, sort: i };
    if (x.id) await g.supabase.from("guest").update(row).eq("id", x.id).eq("household_id", h.id);
    else await g.supabase.from("guest").insert({ ...row, wedding_id: h.wedding_id, household_id: h.id });
  }
  await logActivity(g.supabase, h.wedding_id, "household.updated", "household", h.id, { name: d.name });
  refresh();
  return ok(null);
}

export async function removeHousehold(input: unknown): Promise<ActionResult> {
  const p = z.object({ householdId: z.uuid() }).safeParse(input);
  if (!p.success) return fail("Something went wrong.");
  const h = await householdFor(p.data.householdId);
  if (!h) return fail("That's already gone.");
  const g = await editor(h.wedding_id);
  if ("error" in g) return fail(g.error);
  await g.supabase.from("household").delete().eq("id", h.id);
  await logActivity(g.supabase, h.wedding_id, "household.updated", "household", h.id, { removed: true });
  refresh();
  return ok(null);
}

/** RSVP deadline and meal choices. Does not turn on sending; that stays off until it's switched on deliberately. */
export async function saveRsvpSettings(input: unknown): Promise<ActionResult> {
  const p = z.object({ weddingId: z.uuid(), deadline: z.iso.date().nullable(), meals: z.array(z.string().trim().min(1).max(60)).max(8) }).safeParse(input);
  if (!p.success) return fail("Check the date and meal names.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  await g.supabase.from("wedding").update({ rsvp_deadline: p.data.deadline, meal_options: p.data.meals }).eq("id", p.data.weddingId);
  await logActivity(g.supabase, p.data.weddingId, "wedding.updated", "wedding", p.data.weddingId, { fields: ["rsvp_deadline", "meal_options"] });
  refresh();
  return ok(null);
}
