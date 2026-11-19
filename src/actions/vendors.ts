"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { editor, fail, logActivity, ok, type ActionResult } from "@/lib/actions";
import { addDays } from "@/lib/dates";
import { CATEGORIES } from "@/lib/plan/templates";
import { todayIso } from "@/lib/today";
import { paymentSchedule, vendorTasks } from "@/lib/vendors/templates";

// Your vendors (F5). Saving a vendor never contacts anyone: these actions only write to the couple's own lists.
const Money = z.coerce.number().min(0).max(10_000_000);
const Key = z.enum(CATEGORIES.map((c) => c.key) as [string, ...string[]]);
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

/** Save a vendor: typed in by hand, or picked from Explore (a public place). Starts as an idea. */
export async function addVendor(input: unknown): Promise<ActionResult<{ id: string }>> {
  const p = z
    .object({
      weddingId: z.uuid(),
      categoryKey: Key,
      name: z.string().trim().min(1).max(200).optional(),
      placeId: z.string().max(200).optional(),
      phone: opt(40), email: opt(200), website: opt(500),
    })
    .safeParse(input);
  if (!p.success) return fail("Add a name for this vendor.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const d = p.data;

  let row: Record<string, unknown> = { wedding_id: d.weddingId, category_key: d.categoryKey, name: d.name, phone: d.phone, email: d.email, website: d.website };
  if (d.placeId) {
    const { data: existing } = await g.supabase.from("vendor").select("id").eq("wedding_id", d.weddingId).eq("place_id", d.placeId).maybeSingle();
    if (existing) return ok({ id: existing.id as string });
    const { data: place } = await g.supabase.from("place").select("id,name,phone,website,address,lat,lng").eq("id", d.placeId).maybeSingle();
    if (!place) return fail("We couldn't find that place.");
    row = { ...row, place_id: place.id, name: place.name, phone: place.phone, website: place.website, address: place.address, lat: place.lat, lng: place.lng };
  }
  if (!row.name) return fail("Add a name for this vendor.");
  const { data, error } = await g.supabase.from("vendor").insert(row).select("id").single();
  if (error || !data) return fail("We couldn't save that vendor. Please try again.");
  await logActivity(g.supabase, d.weddingId, "vendor.added", "vendor", data.id, { name: row.name, category: d.categoryKey });
  refresh();
  return ok({ id: data.id as string });
}

async function vendorFor(vendorId: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("vendor").select("id,wedding_id,name,status,category_key").eq("id", vendorId).maybeSingle();
  return data as { id: string; wedding_id: string; name: string; status: string; category_key: string } | null;
}

/** Edit what you know about a vendor: contact details, notes, tags, day-of details. */
export async function updateVendor(input: unknown): Promise<ActionResult> {
  const p = z
    .object({
      vendorId: z.uuid(),
      name: z.string().trim().min(1).max(200).optional(),
      phone: opt(40), email: opt(200), website: opt(500), address: opt(300),
      notes: z.string().max(4000).optional(),
      tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
      arrivalTime: opt(20), onsiteContact: opt(200),
    })
    .safeParse(input);
  if (!p.success) return fail("Something was off in those details.");
  const v = await vendorFor(p.data.vendorId);
  if (!v) return fail("We couldn't find that vendor.");
  const g = await editor(v.wedding_id);
  if ("error" in g) return fail(g.error);
  const d = p.data;
  const patch: Record<string, unknown> = {};
  if (d.name !== undefined) patch.name = d.name;
  for (const [k, col] of [["phone", "phone"], ["email", "email"], ["website", "website"], ["address", "address"], ["arrivalTime", "arrival_time"], ["onsiteContact", "onsite_contact"]] as const) {
    if (k in (input as object)) patch[col] = d[k];
  }
  if (d.notes !== undefined) patch.notes = d.notes;
  if (d.tags !== undefined) patch.tags = d.tags;
  const { error } = await g.supabase.from("vendor").update(patch).eq("id", v.id);
  if (error) return fail("We couldn't save that. Please try again.");
  await logActivity(g.supabase, v.wedding_id, "vendor.updated", "vendor", v.id, { fields: Object.keys(patch) });
  refresh();
  return ok(null);
}

/** Move a vendor along: idea → contacted → quoted. Booking has its own flow; passing keeps a reason. */
export async function setVendorStatus(input: unknown): Promise<ActionResult> {
  const p = z.object({ vendorId: z.uuid(), status: z.enum(["idea", "contacted", "quoted", "passed"]), reason: opt(200) }).safeParse(input);
  if (!p.success) return fail("Something went wrong.");
  const v = await vendorFor(p.data.vendorId);
  if (!v) return fail("We couldn't find that vendor.");
  const g = await editor(v.wedding_id);
  if ("error" in g) return fail(g.error);
  if (v.status === "booked" && p.data.status !== "passed") return fail("This vendor is booked. Cancel the booking first.");
  const patch: Record<string, unknown> = { status: p.data.status, pass_reason: p.data.status === "passed" ? p.data.reason : null };
  if (v.status === "booked") {
    // Un-booking: the accepted quote stops counting as committed. Payments already made stay on record.
    await g.supabase.from("quote").update({ accepted_at: null }).eq("vendor_id", v.id);
    await g.supabase.from("payment").delete().eq("vendor_id", v.id).is("paid_on", null);
    patch.booked_at = null;
  }
  await g.supabase.from("vendor").update(patch).eq("id", v.id);
  await logActivity(g.supabase, v.wedding_id, p.data.status === "passed" ? "vendor.passed" : "vendor.status_changed", "vendor", v.id, { status: [v.status, p.data.status] });
  refresh();
  return ok(null);
}

/** Record a quote. A per-guest price is stored as the per-guest amount and today's total. */
export async function addQuote(input: unknown): Promise<ActionResult> {
  const p = z
    .object({
      vendorId: z.uuid(),
      basis: z.enum(["flat", "per_guest"]),
      amount: Money,
      guests: z.coerce.number().int().min(0).max(1000).default(0),
      inclusions: opt(1000),
      expiresOn: z.iso.date().optional().or(z.literal("").transform(() => undefined)),
    })
    .safeParse(input);
  if (!p.success) return fail("Add the price you were quoted.");
  const v = await vendorFor(p.data.vendorId);
  if (!v) return fail("We couldn't find that vendor.");
  const g = await editor(v.wedding_id);
  if ("error" in g) return fail(g.error);
  const d = p.data;
  const total = d.basis === "per_guest" ? d.amount * d.guests : d.amount;
  const { error } = await g.supabase.from("quote").insert({
    wedding_id: v.wedding_id, vendor_id: v.id, pricing_basis: d.basis, total,
    per_guest_amount: d.basis === "per_guest" ? d.amount : null, inclusions: d.inclusions, expires_on: d.expiresOn ?? null,
  });
  if (error) return fail("We couldn't save that quote. Please try again.");
  if (v.status === "idea" || v.status === "contacted") await g.supabase.from("vendor").update({ status: "quoted" }).eq("id", v.id);
  await logActivity(g.supabase, v.wedding_id, "quote.added", "vendor", v.id, { total });
  refresh();
  return ok(null);
}

/** "Did you reach out?" Logs the contact (we never send it) and sets a gentle follow-up. */
export async function logContact(input: unknown): Promise<ActionResult> {
  const p = z
    .object({ vendorId: z.uuid(), channel: z.enum(["call", "text", "email", "in_person", "other"]), note: opt(1000), followUpDays: z.coerce.number().int().min(0).max(60).default(5) })
    .safeParse(input);
  if (!p.success) return fail("Something went wrong.");
  const v = await vendorFor(p.data.vendorId);
  if (!v) return fail("We couldn't find that vendor.");
  const g = await editor(v.wedding_id);
  if ("error" in g) return fail(g.error);
  const { data: me } = await g.supabase.from("wedding_member").select("id").eq("wedding_id", v.wedding_id).eq("user_id", g.userId).maybeSingle();
  await g.supabase.from("vendor_contact").insert({ wedding_id: v.wedding_id, vendor_id: v.id, channel: p.data.channel, note: p.data.note, member_id: me?.id ?? null });
  const patch: Record<string, unknown> = { follow_up_on: p.data.followUpDays ? addDays(todayIso(), p.data.followUpDays) : null };
  if (v.status === "idea") patch.status = "contacted";
  await g.supabase.from("vendor").update(patch).eq("id", v.id);
  await logActivity(g.supabase, v.wedding_id, "vendor.contacted", "vendor", v.id, { channel: p.data.channel });
  refresh();
  return ok(null);
}

/** Book: accept a quote (or type a price), schedule payments, add this vendor's to-dos. One transaction in the database. */
export async function bookVendor(input: unknown): Promise<ActionResult> {
  const p = z
    .object({
      vendorId: z.uuid(),
      quoteId: z.uuid().optional(),
      basis: z.enum(["flat", "per_guest"]).default("flat"),
      amount: Money.optional(),
      schedule: z.enum(["half_now", "three_equal", "full_now", "unsure"]),
      addTasks: z.boolean().default(true),
    })
    .safeParse(input);
  if (!p.success) return fail("Pick a quote or enter the price you agreed.");
  const v = await vendorFor(p.data.vendorId);
  if (!v) return fail("We couldn't find that vendor.");
  const g = await editor(v.wedding_id);
  if ("error" in g) return fail(g.error);
  const { data: w } = await g.supabase.from("wedding").select("date,guest_estimate").eq("id", v.wedding_id).single();
  const today = todayIso();
  const weddingDate = (w?.date as string | null) ?? addDays(today, 365);
  const guests = Number(w?.guest_estimate ?? 0);

  let quoteId = p.data.quoteId ?? null;
  let total = 0;
  if (quoteId) {
    const { data: q } = await g.supabase.from("quote").select("id,total,pricing_basis,per_guest_amount").eq("id", quoteId).eq("vendor_id", v.id).maybeSingle();
    if (!q) return fail("We couldn't find that quote.");
    total = q.pricing_basis === "per_guest" && q.per_guest_amount != null ? Number(q.per_guest_amount) * guests : Number(q.total);
  } else {
    if (p.data.amount == null) return fail("Enter the price you agreed.");
    const perGuest = p.data.basis === "per_guest";
    total = perGuest ? p.data.amount * guests : p.data.amount;
    const { data: q, error } = await g.supabase.from("quote").insert({
      wedding_id: v.wedding_id, vendor_id: v.id, pricing_basis: p.data.basis, total, per_guest_amount: perGuest ? p.data.amount : null,
    }).select("id").single();
    if (error || !q) return fail("We couldn't save that price. Please try again.");
    quoteId = q.id as string;
  }
  const payments = paymentSchedule(p.data.schedule, Math.round(total * 100) / 100, weddingDate, today);
  const tasks = p.data.addTasks ? vendorTasks(v.category_key, weddingDate, today) : [];
  const { error } = await g.supabase.rpc("book_vendor", { p_vendor: v.id, p_quote: quoteId, p_payments: payments, p_tasks: tasks });
  if (error) return fail("We couldn't book that. Please try again.");
  refresh();
  return ok(null);
}
