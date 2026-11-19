import { z } from "zod";
import { costRange, roundTo } from "./cost";
import { CATEGORIES, PRIORITY_CATEGORIES, TASKS, type CategoryKey, type Stage } from "./templates";

// Answers from the three-question start (+ optional welcome survey). Shared by browser and server.
export const PlanAnswers = z.object({
  date: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("exact"), value: z.iso.date() }),
      z.object({
        kind: z.literal("season"),
        season: z.enum(["spring", "summer", "fall", "winter"]),
        year: z.number().int().min(2024).max(2040),
      }),
      z.object({ kind: z.literal("unknown") }),
    ])
    .default({ kind: "unknown" }),
  guests: z.number().int().min(1).max(1000).nullable().default(null),
  budget: z.number().min(0).max(10_000_000).nullable().default(null),
  stage: z.enum(["just_engaged", "venue_booked", "some_vendors", "final_stretch"]).default("just_engaged"),
  priorities: z.array(z.enum(["food", "photos", "music", "venue", "attire", "guest_experience"])).max(3).default([]),
  location: z.string().max(120).nullable().default(null),
});
export type PlanAnswers = z.infer<typeof PlanAnswers>;

export const DEFAULT_GUESTS = 117; // The Knot 2026 average

export type PlannedCategory = { key: CategoryKey; name: string; planned: number; perGuest: boolean };
export type PlannedTask = {
  key: string;
  title: string;
  why: string | null;
  category: string;
  dueOffsetDays: number;
  dueDate: string; // ISO date
  status: "todo" | "done";
};
export type Plan = {
  date: string; // ISO date, possibly estimated
  dateIsEstimate: boolean;
  dateFlex: string | null;
  guests: number;
  guestsIsEstimate: boolean;
  budget: number;
  budgetIsEstimate: boolean;
  categories: PlannedCategory[];
  tasks: PlannedTask[];
  firstSteps: PlannedTask[];
};

const SEASON_MONTH: Record<"spring" | "summer" | "fall" | "winter", number> = {
  spring: 4, summer: 6, fall: 9, winter: 0,
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

function resolveDate(a: PlanAnswers, today: string) {
  if (a.date.kind === "exact") return { date: a.date.value, estimate: false, flex: null };
  if (a.date.kind === "season") {
    const month = SEASON_MONTH[a.date.season];
    // Winter of year Y means Dec of Y (Jan would read as the year before).
    const d = new Date(Date.UTC(a.date.year, a.date.season === "winter" ? 11 : month, 15));
    return { date: isoDate(d), estimate: true, flex: `${a.date.season} ${a.date.year}` };
  }
  return { date: addDays(today, 365), estimate: true, flex: null };
}

/** Split a total across categories, nudging the couple's priorities up, rounded to $50, summing exactly. */
export function splitBudget(total: number, priorities: PlanAnswers["priorities"]): PlannedCategory[] {
  const boosted = new Set(priorities.flatMap((p) => PRIORITY_CATEGORIES[p]));
  const weights = CATEGORIES.map((c) => (boosted.has(c.key) ? c.share * 1.25 : c.share));
  const sum = weights.reduce((a, b) => a + b, 0);
  const cats = CATEGORIES.map((c, i) => ({
    key: c.key,
    name: c.name,
    planned: roundTo((total * weights[i]) / sum, 50),
    perGuest: Boolean(c.perGuest),
  }));
  // Put any rounding difference in the cushion so categories add up to the total.
  const diff = roundTo(total, 1) - cats.reduce((a, c) => a + c.planned, 0);
  const cushion = cats.find((c) => c.key === "other")!;
  cushion.planned = Math.max(0, cushion.planned + diff);
  return cats;
}

/** Pure: same answers + same day → same plan, in the browser (preview) and on the server (save). */
export function generatePlan(input: PlanAnswers, today: string): Plan {
  const a = PlanAnswers.parse(input);
  const { date, estimate: dateIsEstimate, flex } = resolveDate(a, today);
  const guests = a.guests ?? DEFAULT_GUESTS;
  const budget = a.budget ?? costRange(guests).typical;

  const tasks: PlannedTask[] = TASKS.map((t) => {
    const raw = addDays(date, t.offsetDays);
    return {
      key: t.key,
      title: t.title,
      why: t.why ?? null,
      category: t.category,
      dueOffsetDays: t.offsetDays,
      dueDate: raw < today ? today : raw, // overdue templates become "do soon", not red
      status: (t.doneFrom?.includes(a.stage as Stage) ? "done" : "todo") as PlannedTask["status"],
    };
  }).sort((x, y) => x.dueDate.localeCompare(y.dueDate) || x.dueOffsetDays - y.dueOffsetDays);

  return {
    date,
    dateIsEstimate,
    dateFlex: flex,
    guests,
    guestsIsEstimate: a.guests === null,
    budget,
    budgetIsEstimate: a.budget === null,
    categories: splitBudget(budget, a.priorities),
    tasks,
    firstSteps: tasks.filter((t) => t.status === "todo").slice(0, 3),
  };
}
