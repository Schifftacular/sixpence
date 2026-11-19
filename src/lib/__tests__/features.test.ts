import { describe, expect, it } from "vitest";
import { countdown } from "../dates";
import { guestWhatIf } from "../guest-cost";
import { categoryBenchmark, benchmarkNote } from "../plan/benchmarks";
import { thisWeek } from "../this-week";
import { paymentSchedule, vendorTasks } from "../vendors/templates";

const TODAY = "2026-11-19";

describe("thisWeek", () => {
  const base = { today: TODAY, tasks: [], payments: [], quotes: [], rsvp: { waiting: 0, deadline: null } };
  it("puts payments due within 14 days first and never shows more than three", () => {
    const r = thisWeek({
      ...base,
      tasks: [
        { id: "t1", title: "Book your florist", due_date: "2026-11-01" },
        { id: "t2", title: "Taste cakes", due_date: "2026-11-22" },
        { id: "t3", title: "Later thing", due_date: "2027-03-01" },
      ],
      payments: [{ id: "p1", label: "Deposit", vendor_name: "Bloom", amount: 600, due_on: "2026-11-28" }],
    });
    expect(r.cards).toHaveLength(3);
    expect(r.cards[0].kind).toBe("payment");
    expect(r.cards[1].title).toMatch(/^Ready when you are/);
    expect(r.more).toBe(1);
  });
  it("ignores payments more than 14 days out", () => {
    const r = thisWeek({ ...base, payments: [{ id: "p", label: "Balance", vendor_name: null, amount: 1, due_on: "2027-01-30" }] });
    expect(r.cards).toHaveLength(0);
  });
});

describe("guestWhatIf", () => {
  const cats = [
    { id: "a", key: "venue", name: "Venue", planned: 9000, perGuest: false },
    { id: "b", key: "catering", name: "Food & drink", planned: 8400, perGuest: true },
    { id: "c", key: "cake", name: "Cake", planned: 600, perGuest: true },
  ];
  it("scales per-guest categories and leaves flat ones alone", () => {
    const w = guestWhatIf({ categories: cats, quotes: [], currentGuests: 120, newGuests: 100, total: 30000, committed: 10000 });
    expect(w.categories[0].newPlanned).toBe(9000);
    expect(w.categories[1].newPlanned).toBe(7000);
    expect(w.plannedDelta).toBeLessThan(0);
    expect(w.newStillFlexible).toBe(20000);
  });
  it("moves committed with a booked per-guest quote", () => {
    const w = guestWhatIf({ categories: cats, quotes: [{ categoryKey: "catering", perGuestAmount: 68, booked: true }], currentGuests: 120, newGuests: 128, total: 30000, committed: 20000 });
    expect(w.committedDelta).toBe(544);
    expect(w.newStillFlexible).toBe(9456);
  });
});

describe("benchmarks", () => {
  it("gives a range around typical and a neutral note outside it", () => {
    const b = categoryBenchmark("photo", 117)!;
    expect(b.low).toBeLessThan(b.typical);
    expect(b.high).toBeGreaterThan(b.typical);
    expect(benchmarkNote(b.high + 1000, b)).toMatch(/fine if this matters/);
    expect(benchmarkNote(b.typical, b)).toBeNull();
  });
});

describe("vendor templates", () => {
  it("splits half now, rest 30 days before, adding up exactly", () => {
    const s = paymentSchedule("half_now", 8160.01, "2027-06-12", TODAY);
    expect(s).toHaveLength(2);
    expect(s[0].dueOn).toBe(TODAY);
    expect(s[1].dueOn).toBe("2027-05-13");
    expect(Math.round((s[0].amount + s[1].amount) * 100)).toBe(816001);
  });
  it("three equal payments add up", () => {
    const s = paymentSchedule("three_equal", 1000, "2027-06-12", TODAY);
    expect(s.reduce((a, p) => a + p.amount, 0)).toBeCloseTo(1000, 2);
  });
  it("never dates vendor tasks before today", () => {
    expect(vendorTasks("catering", "2026-12-01", TODAY).every((t) => t.dueDate >= TODAY)).toBe(true);
  });
});

describe("countdown", () => {
  it("speaks in months until the last 30 days", () => {
    expect(countdown("2027-09-18", TODAY)).toBe("10 months to go");
    expect(countdown("2026-12-01", TODAY)).toBe("12 days to go");
  });
});
