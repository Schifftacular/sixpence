import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { moneyNumbers, type MoneyNumbers } from "@/lib/money";
import type { Role } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

export type WeddingRow = {
  id: string;
  name: string;
  date: string | null;
  date_flex: string | null;
  date_is_estimate: boolean;
  guest_estimate: number | null;
  guest_estimate_is_estimate: boolean;
  budget_total: number | null;
  budget_is_estimate: boolean;
  is_sample: boolean;
};

export type WeddingContext = {
  wedding: WeddingRow;
  role: Role | null; // null = visitor on the sample wedding
  readOnly: boolean;
  userId: string | null;
  money: MoneyNumbers | null; // null when this person can't see the budget
  partnerDot: boolean;
};

/** Loads what every screen of a wedding needs. RLS decides what comes back. Cached per request. */
export const loadWedding = cache(async (weddingId: string): Promise<WeddingContext> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string | undefined) ?? null;

  const { data: wedding } = await supabase
    .from("wedding")
    .select("id,name,date,date_flex,date_is_estimate,guest_estimate,guest_estimate_is_estimate,budget_total,budget_is_estimate,is_sample")
    .eq("id", weddingId)
    .maybeSingle<WeddingRow>();
  if (!wedding) notFound();

  let role: Role | null = null;
  let lastSeen: string | null = null;
  if (userId) {
    const { data: me } = await supabase
      .from("wedding_member")
      .select("role,last_seen_activity_at")
      .eq("wedding_id", weddingId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle<{ role: Role; last_seen_activity_at: string }>();
    role = me?.role ?? null;
    lastSeen = me?.last_seen_activity_at ?? null;
  }

  const { data: cats } = await supabase.from("budget_category").select("id").eq("wedding_id", weddingId).limit(1);
  const canSeeBudget = (cats?.length ?? 0) > 0 || wedding.budget_total != null;
  const money = canSeeBudget
    ? moneyNumbers({
        budgetTotal: Number(wedding.budget_total ?? 0),
        guestCount: wedding.guest_estimate ?? 0,
        acceptedQuotes: [], // quotes arrive in Milestone 4
        payments: [],
      })
    : null;

  let partnerDot = false;
  if (userId && lastSeen) {
    const { count } = await supabase
      .from("activity")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", weddingId)
      .eq("actor_type", "user")
      .neq("actor_id", userId)
      .gt("created_at", lastSeen);
    partnerDot = (count ?? 0) > 0;
  }

  const readOnly = wedding.is_sample || role === null || role === "viewer" || role === "funder" || role === "vendor";
  return { wedding, role, readOnly, userId, money, partnerDot };
});
