"use server";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

// Public RSVP: a guest with a private household link, no sign-in. Off unless production AND the wedding turned sending on.
export async function submitRsvp(input: unknown): Promise<ActionResult> {
  if (process.env.APP_ENV !== "production") return fail("RSVPs aren't open yet.");
  const p = z.object({
    token: z.string().regex(/^[a-f0-9]{32}$/),
    guests: z.array(z.object({ id: z.uuid(), attending: z.boolean(), meal: z.string().max(80).optional(), dietary: z.string().max(200).optional() })).min(1).max(30),
    note: z.string().max(500).optional(),
  }).safeParse(input);
  if (!p.success) return fail("Please answer for everyone.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rsvp_submit", { p_token: p.data.token, p_guests: p.data.guests, p_note: p.data.note ?? null });
  if (error || data !== true) return fail("This link isn't working. Please check with the couple.");
  return ok(null);
}
