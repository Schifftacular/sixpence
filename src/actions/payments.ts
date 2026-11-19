"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { editor, fail, logActivity, ok, type ActionResult } from "@/lib/actions";

export async function markPaid(input: unknown): Promise<ActionResult> {
  const p = z.object({ weddingId: z.uuid(), paymentId: z.uuid(), amount: z.coerce.number().positive(), paidOn: z.iso.date() }).safeParse(input);
  if (!p.success) return fail("Check the amount and date.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const { error } = await g.supabase.rpc("mark_payment_paid", { p_payment: p.data.paymentId, p_amount: p.data.amount, p_paid_on: p.data.paidOn });
  if (error) return fail(error.message.includes("bad amount") ? "That's more than this payment." : "That didn't save. Try again; nothing was lost.");
  refresh();
  return ok(null);
}

export async function addPayment(input: unknown): Promise<ActionResult> {
  const p = z
    .object({
      weddingId: z.uuid(),
      vendorId: z.uuid().nullable().default(null),
      label: z.string().trim().min(1).max(80),
      amount: z.coerce.number().positive(),
      dueOn: z.iso.date().nullable().default(null),
      paid: z.boolean().default(false),
    })
    .safeParse(input);
  if (!p.success) return fail("Add a name, amount and date.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const { data, error } = await g.supabase
    .from("payment")
    .insert({ wedding_id: p.data.weddingId, vendor_id: p.data.vendorId, label: p.data.label, amount: p.data.amount, due_on: p.data.dueOn, paid_on: p.data.paid ? (p.data.dueOn ?? new Date().toISOString().slice(0, 10)) : null })
    .select("id")
    .single();
  if (error || !data) return fail("That didn't save. Try again; nothing was lost.");
  await logActivity(g.supabase, p.data.weddingId, "payment.added", "payment", data.id, { amount: p.data.amount });
  refresh();
  return ok(null);
}
