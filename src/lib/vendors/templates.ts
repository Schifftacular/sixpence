// Per-category "to do with this vendor" lists and payment schedule presets (F5). App assumptions.
import { addDays } from "@/lib/dates";

export type VendorTaskTemplate = { key: string; title: string; why?: string; offsetDays: number };

const COMMON: VendorTaskTemplate[] = [
  { key: "confirm_arrival", title: "Confirm arrival time and day-of contact", why: "Feeds The Day so nobody is guessing on the morning.", offsetDays: -14 },
];

export const VENDOR_TASKS: Record<string, VendorTaskTemplate[]> = {
  venue: [
    { key: "venue_walkthrough", title: "Do a walkthrough with the venue", why: "Plan layout, power and rain backup.", offsetDays: -60 },
    { key: "venue_insurance", title: "Check if the venue needs event insurance", offsetDays: -90 },
    { key: "venue_final_count", title: "Send the venue your final headcount", offsetDays: -14 },
  ],
  catering: [
    { key: "cater_tasting", title: "Schedule a tasting", why: "Most caterers include one after booking.", offsetDays: -180 },
    { key: "cater_menu", title: "Finalize the menu", offsetDays: -60 },
    { key: "cater_headcount", title: "Give the caterer your final headcount", why: "Check your contract: some want it earlier.", offsetDays: -21 },
  ],
  photo: [
    { key: "photo_shotlist", title: "Send your photographer a shot list", why: "Names of family groups saves time on the day.", offsetDays: -30 },
    { key: "photo_engagement", title: "Plan engagement photos (optional)", offsetDays: -200 },
  ],
  video: [{ key: "video_brief", title: "Share must-have moments with your videographer", offsetDays: -30 }],
  music: [
    { key: "music_songs", title: "Send your DJ or band the song list", why: "First dance, entrances and do-not-play list.", offsetDays: -30 },
    { key: "music_ceremony", title: "Pick ceremony music", offsetDays: -45 },
  ],
  flowers: [
    { key: "flowers_design", title: "Meet your florist about designs", offsetDays: -120 },
    { key: "flowers_final", title: "Confirm final flower count", offsetDays: -21 },
  ],
  attire: [
    { key: "attire_fitting1", title: "First fitting", offsetDays: -90 },
    { key: "attire_final", title: "Final fitting and pickup", offsetDays: -14 },
  ],
  beauty: [{ key: "beauty_trial", title: "Hair and makeup trial", offsetDays: -60 }],
  cake: [{ key: "cake_design", title: "Choose cake flavors and design", offsetDays: -90 }],
  stationery: [{ key: "stationery_proof", title: "Approve invitation proofs", offsetDays: -100 }],
  officiant: [
    { key: "officiant_ceremony", title: "Write the ceremony with your officiant", offsetDays: -45 },
    { key: "officiant_rehearsal", title: "Confirm the rehearsal time", offsetDays: -14 },
  ],
  transport: [{ key: "transport_schedule", title: "Send pickup times and addresses", offsetDays: -14 }],
  rentals: [{ key: "rentals_order", title: "Confirm the rental order and delivery window", offsetDays: -30 }],
  planner: [{ key: "planner_handoff", title: "Hand your planner the vendor list and timeline", offsetDays: -30 }],
};

export function vendorTasks(categoryKey: string, weddingDate: string, today: string) {
  const list = [...(VENDOR_TASKS[categoryKey] ?? []), ...COMMON];
  return list.map((t) => {
    const due = addDays(weddingDate, t.offsetDays);
    return { key: t.key, title: t.title, why: t.why ?? null, dueOffsetDays: t.offsetDays, dueDate: due < today ? today : due };
  });
}

export type SchedulePreset = "half_now" | "three_equal" | "full_now" | "unsure";
export type ScheduledPayment = { label: string; kind: "deposit" | "installment" | "final"; amount: number; dueOn: string | null };

/** "50% deposit now, rest 30 days before", "3 equal payments", "pay in full", or "not sure yet". */
export function paymentSchedule(preset: SchedulePreset, total: number, weddingDate: string, today: string): ScheduledPayment[] {
  const cents = (n: number) => Math.round(n * 100) / 100;
  const before = (days: number) => {
    const d = addDays(weddingDate, -days);
    return d < today ? today : d;
  };
  if (preset === "unsure" || total <= 0) return [];
  if (preset === "full_now") return [{ label: "Payment in full", kind: "final", amount: cents(total), dueOn: today }];
  if (preset === "half_now") {
    const dep = cents(total / 2);
    return [
      { label: "Deposit", kind: "deposit", amount: dep, dueOn: today },
      { label: "Balance", kind: "final", amount: cents(total - dep), dueOn: before(30) },
    ];
  }
  const third = cents(total / 3);
  const mid = addDays(today, Math.max(30, Math.round((Date.parse(weddingDate) - Date.parse(today)) / 86_400_000 / 2)));
  return [
    { label: "Deposit", kind: "deposit", amount: third, dueOn: today },
    { label: "Installment", kind: "installment", amount: third, dueOn: mid < before(30) ? mid : before(30) },
    { label: "Final payment", kind: "final", amount: cents(total - third * 2), dueOn: before(14) },
  ];
}
