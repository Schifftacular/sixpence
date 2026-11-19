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

import { distanceText, project, venueTypeOf } from "@/lib/explore/places";
describe("explore places", () => {
  it("formats distance in miles", () => {
    expect(distanceText(0.5)).toBe("under a mile");
    expect(distanceText(8)).toBe("5.0 mi");
    expect(distanceText(40)).toBe("25 mi");
  });
  it("groups venue subtypes", () => {
    expect(venueTypeOf("barn")).toBe("farm");
    expect(venueTypeOf("winery")).toBe("wine");
    expect(venueTypeOf(null)).toBeNull();
  });
  it("projects home to the center and keeps points in the box", () => {
    const home = { lat: 35.6, lng: -82.55 };
    const pts = [{ lat: 35.7, lng: -82.5 }, { lat: 35.5, lng: -82.7 }];
    const { at } = project(pts, home, 300);
    expect(at(home)).toEqual({ x: 150, y: 150 });
    for (const p of pts.map(at)) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(300); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(300); }
  });
});

import { draftDay, timeLabel } from "@/lib/plan/day";
describe("day timeline", () => {
  it("builds around the ceremony and uses vendor arrival times", () => {
    const ev = draftDay("16:30", [{ id: "v1", name: "Night Owl", category_key: "music", arrival_time: null }, { id: "v2", name: "Lens Co", category_key: "photo", arrival_time: "13:00" }]);
    expect(ev.find((e) => e.title === "Ceremony")?.startsAt).toBe("16:30");
    expect(ev.find((e) => e.vendorId === "v1")?.startsAt).toBe("15:00");
    expect(ev.find((e) => e.vendorId === "v2")?.startsAt).toBe("13:00");
    expect(ev[0].startsAt <= ev[ev.length - 1].startsAt).toBe(true);
  });
  it("labels times in 12-hour form", () => {
    expect(timeLabel("16:30")).toBe("4:30 pm");
    expect(timeLabel("00:05")).toBe("12:05 am");
    expect(timeLabel("12:00")).toBe("12:00 pm");
  });
});

import { guestsCsv, parseHousehold, parseList, rsvpCounts } from "@/lib/guests/parse";
describe("guest quick add", () => {
  it("shares a last name across a couple", () => {
    const h = parseHousehold("Ana & Luis Pérez")!;
    expect(h.guests.map((g) => `${g.firstName} ${g.lastName}`)).toEqual(["Ana Pérez", "Luis Pérez"]);
  });
  it("handles plus-ones and kids", () => {
    const a = parseHousehold("Maya Chen +1")!;
    expect(a.plusOneAllowed).toBe(true);
    expect(a.guests).toHaveLength(2);
    const b = parseHousehold("Tom and Priya Shah (kids: Leo, Mia)")!;
    expect(b.guests.filter((g) => g.isChild).map((g) => g.firstName)).toEqual(["Leo", "Mia"]);
    expect(b.name).toBe("Tom and Priya Shah");
  });
  it("parses a pasted list and skips blanks", () => {
    expect(parseList("Grandma Rose\n\n- Sam Lee\n")).toHaveLength(2);
  });
  it("counts RSVPs and escapes CSV", () => {
    const c = rsvpCounts([{ responded_at: "x", guests: [{ attending: true, is_child: false }, { attending: null, is_child: true }] }]);
    expect(c).toMatchObject({ guests: 2, yes: 1, waiting: 1, kids: 1, responded: 1 });
    const csv = guestsCsv([{ name: "Lee, Sam", side: null, group_name: null, email: null, address: null, guests: [{ first_name: "Sam", last_name: "Lee", is_child: false, attending: true, meal: null, dietary: null }] }]);
    expect(csv.split("\n")[1].startsWith('"Lee, Sam",Sam,Lee')).toBe(true);
  });
});
