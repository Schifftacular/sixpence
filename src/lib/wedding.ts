import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { moneyNumbers, quoteCost, type MoneyNumbers } from "@/lib/money";
import type { Role } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

export type WeddingRow = {
  id: string;
  name: string;
  date: string | null;
  date_flex: string | null;
  date_is_estimate: boolean;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  guest_estimate: number | null;
  guest_estimate_is_estimate: boolean;
  budget_total: number | null;
  budget_is_estimate: boolean;
  is_sample: boolean;
  outbound_enabled: boolean;
  rsvp_deadline: string | null;
  meal_options: string[];
  ceremony_time: string | null;
  planning_stage: string | null;
  priorities: string[];
  style_tags: string[];
};

export type CategoryMoney = { committed: number; paid: number; due: number };

export type WeddingContext = {
  wedding: WeddingRow;
  role: Role | null; // null = visitor on the sample wedding
  readOnly: boolean;
  userId: string | null;
  memberId: string | null;
  displayName: string | null;
  money: MoneyNumbers | null; // null when this person can't see the budget
  byCategory: Record<string, CategoryMoney>;
  partnerDot: boolean;
  lastSeen: string | null;
};

const WEDDING_COLS =
  "id,name,date,date_flex,date_is_estimate,location_text,lat,lng,guest_estimate,guest_estimate_is_estimate,budget_total,budget_is_estimate,is_sample,outbound_enabled,rsvp_deadline,meal_options,ceremony_time,planning_stage,priorities,style_tags";

type QuoteRow = { total: number; pricing_basis: "flat" | "per_guest"; per_guest_amount: number | null; accepted_at: string | null; vendor: { category_key: string; status: string } | null };
type PaymentRow = { amount: number; paid_on: string | null; vendor: { category_key: string } | null };

/** Loads what every screen of a wedding needs. RLS decides what comes back. Cached per request. */
export const loadWedding = cache(async (weddingId: string): Promise<WeddingContext> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string | undefined) ?? null;

  const { data: wedding } = await supabase.from("wedding").select(WEDDING_COLS).eq("id", weddingId).maybeSingle<WeddingRow>();
  if (!wedding) notFound();

  let role: Role | null = null;
  let lastSeen: string | null = null;
  let memberId: string | null = null;
  let displayName: string | null = null;
  if (userId) {
    const { data: me } = await supabase
      .from("wedding_member")
      .select("id,role,last_seen_activity_at,display_name")
      .eq("wedding_id", weddingId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle<{ id: string; role: Role; last_seen_activity_at: string; display_name: string | null }>();
    role = me?.role ?? null;
    lastSeen = me?.last_seen_activity_at ?? null;
    memberId = me?.id ?? null;
    displayName = me?.display_name ?? null;
  }

  const canSeeBudget = wedding.is_sample || role === "owner" || role === "collaborator" || role === "funder";
  const guests = wedding.guest_estimate ?? 0;
  let money: MoneyNumbers | null = null;
  const byCategory: Record<string, CategoryMoney> = {};
  if (canSeeBudget) {
    const [{ data: quotes }, { data: payments }, { data: contributions }] = await Promise.all([
      supabase.from("quote").select("total,pricing_basis,per_guest_amount,accepted_at,vendor:vendor_id(category_key,status)")
        .eq("wedding_id", weddingId).not("accepted_at", "is", null).returns<QuoteRow[]>(),
      supabase.from("payment").select("amount,paid_on,vendor:vendor_id(category_key)").eq("wedding_id", weddingId).returns<PaymentRow[]>(),
      supabase.from("contribution").select("amount").eq("wedding_id", weddingId),
    ]);
    const accepted = (quotes ?? [])
      .filter((q) => q.vendor?.status === "booked")
      .map((q) => ({ total: Number(q.total), pricingBasis: q.pricing_basis, perGuestAmount: q.per_guest_amount == null ? null : Number(q.per_guest_amount), key: q.vendor!.category_key }));
    for (const q of accepted) {
      const c = (byCategory[q.key] ??= { committed: 0, paid: 0, due: 0 });
      c.committed += quoteCost(q, guests);
    }
    for (const p of payments ?? []) {
      const key = p.vendor?.category_key ?? "other";
      const c = (byCategory[key] ??= { committed: 0, paid: 0, due: 0 });
      if (p.paid_on) c.paid += Number(p.amount);
      else c.due += Number(p.amount);
    }
    money = moneyNumbers({
      budgetTotal: Number(wedding.budget_total ?? 0),
      guestCount: guests,
      acceptedQuotes: accepted,
      payments: (payments ?? []).map((p) => ({ amount: Number(p.amount), paidAt: p.paid_on })),
      contributions: (contributions ?? []).map((c) => Number(c.amount)),
    });
  }

  let partnerDot = false;
  if (userId && lastSeen) {
    const { count } = await supabase
      .from("activity")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", weddingId)
      .in("actor_type", ["user", "guest"])
      .or(`actor_id.neq.${userId},actor_id.is.null`)
      .gt("created_at", lastSeen);
    partnerDot = (count ?? 0) > 0;
  }

  const readOnly = wedding.is_sample || role === null || role === "viewer" || role === "funder" || role === "vendor";
  return { wedding, role, readOnly, userId, memberId, displayName, money, byCategory, partnerDot, lastSeen };
});
