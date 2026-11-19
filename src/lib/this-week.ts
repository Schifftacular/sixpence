// Home "This week" (F2): at most three cards, in a fixed priority order. Pure, so it is easy to test.
import { addDays, daysBetween, shortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export type WeekInput = {
  today: string;
  tasks: { id: string; title: string; due_date: string | null; vendor_id?: string | null }[];
  payments: { id: string; label: string; vendor_name: string | null; amount: number; due_on: string | null }[];
  quotes: { vendor_id: string; vendor_name: string; total: number; expires_on: string | null }[];
  rsvp: { waiting: number; deadline: string | null };
};

export type WeekCard = {
  key: string;
  kind: "payment" | "task" | "rsvp" | "quote";
  title: string;
  sub: string;
  action: string;
  refId: string;
};

export function thisWeek(input: WeekInput, limit = 3): { cards: WeekCard[]; more: number } {
  const { today } = input;
  const cards: WeekCard[] = [];

  // 1. Payments due within 14 days.
  for (const p of input.payments) {
    if (!p.due_on || daysBetween(today, p.due_on) > 14) continue;
    const when = p.due_on <= today ? "due now" : `due ${shortDate(p.due_on)}`;
    cards.push({
      key: `pay:${p.id}`, kind: "payment", refId: p.id, action: "Mark paid",
      title: `${p.vendor_name ? `${p.vendor_name} ` : ""}${p.label.toLowerCase()} · ${formatMoney(p.amount)}`,
      sub: `Your ${p.label.toLowerCase()} is ${when}.`,
    });
  }
  // 2. Tasks due this week, including ones whose date has passed ("Ready when you are", never "overdue").
  const weekEnd = addDays(today, 7);
  for (const t of input.tasks) {
    if (!t.due_date || t.due_date > weekEnd) continue;
    const ready = t.due_date < today;
    cards.push({
      key: `task:${t.id}`, kind: "task", refId: t.id, action: "Mark done",
      title: ready ? `Ready when you are: ${t.title.charAt(0).toLowerCase()}${t.title.slice(1)}` : t.title,
      sub: ready ? "No rush, it's on your list." : `This week · ${shortDate(t.due_date)}`,
    });
  }
  // 3. RSVPs closing within 14 days.
  if (input.rsvp.waiting > 0 && input.rsvp.deadline && daysBetween(today, input.rsvp.deadline) <= 14 && input.rsvp.deadline >= today) {
    cards.push({
      key: "rsvp", kind: "rsvp", refId: "rsvp", action: "See who's waiting",
      title: `${input.rsvp.waiting} household${input.rsvp.waiting === 1 ? "" : "s"} still thinking`,
      sub: `RSVPs close ${shortDate(input.rsvp.deadline)}.`,
    });
  }
  // 4. Other: quotes expiring within 10 days, then the next tasks.
  for (const q of input.quotes) {
    if (!q.expires_on || q.expires_on < today || daysBetween(today, q.expires_on) > 10) continue;
    cards.push({
      key: `quote:${q.vendor_id}`, kind: "quote", refId: q.vendor_id, action: "Compare quotes",
      title: `${q.vendor_name} quote ends ${shortDate(q.expires_on)}`,
      sub: `${formatMoney(q.total)} · decide or let it go.`,
    });
  }
  const used = new Set(cards.map((c) => c.key));
  for (const t of input.tasks) {
    if (used.has(`task:${t.id}`)) continue;
    cards.push({ key: `task:${t.id}`, kind: "task", refId: t.id, action: "Mark done", title: t.title,
      sub: t.due_date ? `Coming up · ${shortDate(t.due_date)}` : "Whenever suits you" });
  }
  return { cards: cards.slice(0, limit), more: Math.max(0, cards.length - limit) };
}
