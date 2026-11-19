import { describe, expect, it } from "vitest";
import { costRange } from "../plan/cost";
import { generatePlan, splitBudget } from "../plan/generate-plan";

const TODAY = "2026-11-19";

describe("generatePlan", () => {
  it("fills skipped answers with marked estimates", () => {
    const p = generatePlan({ date: { kind: "unknown" }, guests: null, budget: null, stage: "just_engaged", priorities: [], location: null }, TODAY);
    expect(p.dateIsEstimate).toBe(true);
    expect(p.date).toBe("2027-11-19");
    expect(p.guests).toBe(117);
    expect(p.guestsIsEstimate).toBe(true);
    expect(p.budget).toBe(costRange(117).typical);
    expect(p.budgetIsEstimate).toBe(true);
  });

  it("is deterministic", () => {
    const a = { date: { kind: "exact" as const, value: "2027-09-18" }, guests: 90, budget: 30000, stage: "venue_booked" as const, priorities: ["photos" as const], location: null };
    expect(generatePlan(a, TODAY)).toEqual(generatePlan(a, TODAY));
  });

  it("marks tasks done by planning stage and keeps first steps open", () => {
    const p = generatePlan({ date: { kind: "exact", value: "2027-09-18" }, guests: 90, budget: 30000, stage: "venue_booked", priorities: [], location: null }, TODAY);
    expect(p.tasks.find((t) => t.key === "book_venue")?.status).toBe("done");
    expect(p.tasks.find((t) => t.key === "book_photo")?.status).toBe("todo");
    expect(p.firstSteps).toHaveLength(3);
    expect(p.firstSteps.every((t) => t.status === "todo")).toBe(true);
  });

  it("never dates a task before today", () => {
    const p = generatePlan({ date: { kind: "exact", value: "2027-01-10" }, guests: 50, budget: 15000, stage: "just_engaged", priorities: [], location: null }, TODAY);
    expect(p.tasks.every((t) => t.dueDate >= TODAY)).toBe(true);
  });

  it("puts winter weddings in December of the chosen year", () => {
    const p = generatePlan({ date: { kind: "season", season: "winter", year: 2027 }, guests: null, budget: null, stage: "just_engaged", priorities: [], location: null }, TODAY);
    expect(p.date).toBe("2027-12-15");
    expect(p.dateFlex).toBe("winter 2027");
  });
});

describe("splitBudget", () => {
  it("adds up exactly to the total", () => {
    for (const total of [12345, 30000, 87650]) {
      expect(splitBudget(total, []).reduce((a, c) => a + c.planned, 0)).toBe(total);
    }
  });
  it("boosts the couple's priorities", () => {
    const base = splitBudget(30000, []).find((c) => c.key === "photo")!.planned;
    const boosted = splitBudget(30000, ["photos"]).find((c) => c.key === "photo")!.planned;
    expect(boosted).toBeGreaterThan(base);
  });
});

import { menuFor } from "../nav";
describe("menuFor", () => {
  it("gives funders a short menu with no guests", () => {
    const m = menuFor({ weddingId: "w", role: "funder", weddingDate: "2027-09-18", today: "2026-11-19" });
    expect(m.map((i) => i.key)).not.toContain("guests");
    expect(m.map((i) => i.key)).toContain("contribution");
  });
  it("gives planners six pillars with Explore second", () => {
    const m = menuFor({ weddingId: "w", role: "owner", weddingDate: "2027-09-18", today: "2026-11-19" });
    const pillars = m.filter((i) => i.group === "pillar").map((i) => i.key);
    expect(pillars).toEqual(["week", "explore", "budget", "guests", "vendors", "plan"]);
    expect(m.find((i) => i.key === "vendors")?.label).toBe("Your vendors");
  });
  it("shows The Day only in the final three months", () => {
    const far = menuFor({ weddingId: "w", role: "owner", weddingDate: "2027-09-18", today: "2026-11-19" });
    const near = menuFor({ weddingId: "w", role: "owner", weddingDate: "2027-01-20", today: "2026-11-19" });
    expect(far.some((i) => i.key === "day")).toBe(false);
    expect(near.some((i) => i.key === "day")).toBe(true);
  });
});
