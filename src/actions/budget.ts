"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { editor, fail, logActivity, ok, type ActionResult } from "@/lib/actions";

const Money = z.coerce.number().min(0).max(10_000_000);

/** Change one category's plan. "keep" takes the difference from the categories the couple picked; "raise" moves the total. */
export async function setCategoryPlan(input: unknown): Promise<ActionResult> {
  const p = z
    .object({
      weddingId: z.uuid(),
      categoryId: z.uuid(),
      amount: Money,
      mode: z.enum(["keep", "raise"]),
      takeFrom: z.array(z.object({ categoryId: z.uuid(), amount: Money })).default([]),
    })
    .safeParse(input);
  if (!p.success) return fail("Check the amount and try again.");
  const { weddingId, categoryId, amount, mode, takeFrom } = p.data;
  const g = await editor(weddingId);
  if ("error" in g) return fail(g.error);
  const { supabase } = g;

  const { data: cat } = await supabase.from("budget_category").select("id,name,target_amount").eq("id", categoryId).eq("wedding_id", weddingId).single();
  if (!cat) return fail("That category is gone.");
  const delta = amount - Number(cat.target_amount);

  if (mode === "keep" && delta > 0) {
    const moved = takeFrom.reduce((a, t) => a + t.amount, 0);
    if (Math.round(moved) !== Math.round(delta)) return fail("Pick where the difference comes from first.");
    for (const t of takeFrom) {
      const { data: src } = await supabase.from("budget_category").select("target_amount").eq("id", t.categoryId).eq("wedding_id", weddingId).single();
      if (!src || Number(src.target_amount) < t.amount) return fail("One of those categories doesn't have that much room.");
      await supabase.from("budget_category").update({ target_amount: Number(src.target_amount) - t.amount }).eq("id", t.categoryId);
    }
  } else if (mode === "keep" && delta < 0) {
    // Freed money goes to the cushion, so the total stays put.
    const { data: cushion } = await supabase.from("budget_category").select("id,target_amount").eq("wedding_id", weddingId).eq("key", "other").maybeSingle();
    if (cushion) await supabase.from("budget_category").update({ target_amount: Number(cushion.target_amount) - delta }).eq("id", cushion.id);
  } else if (mode === "raise") {
    const { data: w } = await supabase.from("wedding").select("budget_total").eq("id", weddingId).single();
    await supabase.from("wedding").update({ budget_total: Number(w?.budget_total ?? 0) + delta, budget_is_estimate: false }).eq("id", weddingId);
  }
  await supabase.from("budget_category").update({ target_amount: amount }).eq("id", categoryId);
  await logActivity(supabase, weddingId, "budget.category_changed", "budget_category", categoryId, { name: cat.name, from: Number(cat.target_amount), to: amount, mode });
  refresh();
  return ok(null);
}

export async function setBudgetTotal(input: unknown): Promise<ActionResult> {
  const p = z.object({ weddingId: z.uuid(), total: Money }).safeParse(input);
  if (!p.success) return fail("Check the amount and try again.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const { data: w } = await g.supabase.from("wedding").select("budget_total").eq("id", p.data.weddingId).single();
  const delta = p.data.total - Number(w?.budget_total ?? 0);
  await g.supabase.from("wedding").update({ budget_total: p.data.total, budget_is_estimate: false }).eq("id", p.data.weddingId);
  // Keep categories adding up: the difference lands in the cushion (never below zero).
  const { data: cushion } = await g.supabase.from("budget_category").select("id,target_amount").eq("wedding_id", p.data.weddingId).eq("key", "other").maybeSingle();
  if (cushion) await g.supabase.from("budget_category").update({ target_amount: Math.max(0, Number(cushion.target_amount) + delta) }).eq("id", cushion.id);
  await logActivity(g.supabase, p.data.weddingId, "budget.total_changed", "wedding", p.data.weddingId, { to: p.data.total });
  refresh();
  return ok(null);
}

export async function addCategory(input: unknown): Promise<ActionResult> {
  const p = z.object({ weddingId: z.uuid(), name: z.string().trim().min(1).max(80), amount: Money.default(0) }).safeParse(input);
  if (!p.success) return fail("Give the category a short name.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const { data, error } = await g.supabase
    .from("budget_category")
    .insert({ wedding_id: p.data.weddingId, name: p.data.name, target_amount: p.data.amount, is_custom: true, sort: 100 })
    .select("id")
    .single();
  if (error || !data) return fail("That didn't save. Try again; nothing was lost.");
  await logActivity(g.supabase, p.data.weddingId, "budget.category_added", "budget_category", data.id, { name: p.data.name });
  refresh();
  return ok(null);
}

/** F4 "Apply": update the guest estimate and the per-guest categories together. */
export async function applyGuestCount(input: unknown): Promise<ActionResult> {
  const p = z
    .object({
      weddingId: z.uuid(),
      guests: z.coerce.number().int().min(1).max(1000),
      categories: z.array(z.object({ id: z.uuid(), planned: Money })),
    })
    .safeParse(input);
  if (!p.success) return fail("Something was off with those numbers.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  await g.supabase.from("wedding").update({ guest_estimate: p.data.guests, guest_estimate_is_estimate: false }).eq("id", p.data.weddingId);
  for (const c of p.data.categories) {
    await g.supabase.from("budget_category").update({ target_amount: c.planned }).eq("id", c.id).eq("wedding_id", p.data.weddingId);
  }
  await logActivity(g.supabase, p.data.weddingId, "guests.estimate_changed", "wedding", p.data.weddingId, { to: p.data.guests });
  refresh();
  return ok(null);
}

export async function addContribution(input: unknown): Promise<ActionResult> {
  const p = z.object({ weddingId: z.uuid(), from: z.string().trim().min(1).max(80), amount: Money, coversCategoryId: z.uuid().nullable().default(null) }).safeParse(input);
  if (!p.success) return fail("Add who it's from and how much.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  await g.supabase.from("contribution").insert({ wedding_id: p.data.weddingId, from_label: p.data.from, amount: p.data.amount, covers_category_id: p.data.coversCategoryId });
  await logActivity(g.supabase, p.data.weddingId, "contribution.added", "wedding", p.data.weddingId, { from: p.data.from });
  refresh();
  return ok(null);
}
