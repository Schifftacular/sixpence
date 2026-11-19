import { describe, expect, it } from "vitest";
import { moneyNumbers } from "../money";

describe("moneyNumbers", () => {
  it("computes committed, paid and still flexible", () => {
    const n = moneyNumbers({
      budgetTotal: 30000,
      guestCount: 100,
      acceptedQuotes: [
        { total: 12000, pricingBasis: "flat" },
        { total: 0, pricingBasis: "per_guest", perGuestAmount: 80 },
      ],
      committedWithoutVendor: [1500],
      payments: [{ amount: 2000, paidAt: "2026-10-01" }, { amount: 5000, paidAt: null }],
      contributions: [5000],
    });
    expect(n.committed).toBe(21500);
    expect(n.paid).toBe(2000);
    expect(n.stillFlexible).toBe(8500);
    expect(n.funded).toBe(5000);
  });
  it("lets still flexible go negative when over plan", () => {
    const n = moneyNumbers({ budgetTotal: 1000, guestCount: 10, acceptedQuotes: [{ total: 1200, pricingBasis: "flat" }], payments: [] });
    expect(n.stillFlexible).toBe(-200);
  });
});
