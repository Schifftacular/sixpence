// Plain sentences for the activity feed ("Sam booked Laurel Ridge Farm"). Pure and shared by This week and Together.
import { formatMoney } from "@/lib/money";
import { categoryName } from "@/lib/plan/templates";

export type ActivityRow = { id: number; actor_type: string; actor_id: string | null; action: string; entity_type: string | null; entity_id: string | null; diff: Record<string, unknown> | null; created_at: string };

const s = (v: unknown) => (typeof v === "string" ? v : "");

export function describeActivity(a: ActivityRow): string {
  const d = a.diff ?? {};
  switch (a.action) {
    case "plan.saved": return "made the starting plan";
    case "task.completed": return "checked off a task";
    case "task.added": return "added a task";
    case "task.updated": return "updated a task";
    case "vendor.added": return `saved ${s(d.name) || "a vendor"}${d.category ? ` for ${categoryName(s(d.category)).toLowerCase()}` : ""}`;
    case "vendor.booked": return `booked ${s(d.name) || "a vendor"}`;
    case "vendor.contacted": return "reached out to a vendor";
    case "vendor.passed": return "passed on a vendor";
    case "vendor.status_changed": case "vendor.updated": return "updated a vendor";
    case "quote.added": return typeof d.total === "number" ? `added a ${formatMoney(d.total)} quote` : "added a quote";
    case "payment.paid": return typeof d.amount === "number" ? `marked ${formatMoney(d.amount)} paid` : "marked a payment paid";
    case "payment.added": return "added a payment";
    case "budget.total_changed": return "changed the total budget";
    case "budget.category_changed": return "changed a budget category";
    case "budget.category_added": return "added a budget category";
    case "guests.estimate_changed": return typeof d.to === "number" ? `set the guest count to ${d.to}` : "changed the guest count";
    case "contribution.added": return `added money from ${s(d.from) || "someone"}`;
    case "board.saved": return `saved ${s(d.title) || "an idea"} to the board`;
    case "board.removed": return "removed something from the board";
    case "member.joined": return "joined the wedding";
    case "rsvp.received": return "sent an RSVP";
    case "household.added": return typeof d.count === "number" ? `added ${d.count} household${d.count === 1 ? "" : "s"}` : "added guests";
    case "household.updated": return "updated a household";
    case "timeline.changed": return "changed the day's timeline";
    case "wedding.updated": return "updated the wedding details";
    case "invite.created": return "created an invite link";
    default: return "made a change";
  }
}

export function relativeTime(iso: string, now = Date.now()): string {
  const m = Math.round((now - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
