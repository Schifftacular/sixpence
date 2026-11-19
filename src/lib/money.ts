// The four Budget numbers. The ONLY place they are computed (UI, emails, agent all call this).
// Total budget · Committed · Paid · Still flexible. See docs/architecture.md "Money numbers".

export type AcceptedQuote = { total: number; pricingBasis: "flat" | "per_guest"; perGuestAmount?: number | null };
export type MoneyInput = {
  budgetTotal: number;
  guestCount: number;
  acceptedQuotes: AcceptedQuote[];
  /** Planned lines with no vendor yet that the couple has committed to (e.g. rings bought). */
  committedWithoutVendor?: number[];
  payments: { amount: number; paidAt: string | null }[];
  contributions?: number[];
};
export type MoneyNumbers = {
  total: number;
  committed: number;
  paid: number;
  stillFlexible: number;
  funded: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function quoteCost(q: AcceptedQuote, guestCount: number): number {
  if (q.pricingBasis === "per_guest" && q.perGuestAmount != null) return q.perGuestAmount * guestCount;
  return q.total;
}

export function moneyNumbers(input: MoneyInput): MoneyNumbers {
  const committed =
    input.acceptedQuotes.reduce((a, q) => a + quoteCost(q, input.guestCount), 0) +
    (input.committedWithoutVendor ?? []).reduce((a, n) => a + n, 0);
  const paid = input.payments.filter((p) => p.paidAt).reduce((a, p) => a + p.amount, 0);
  const funded = (input.contributions ?? []).reduce((a, n) => a + n, 0);
  return {
    total: cents(input.budgetTotal),
    committed: cents(committed),
    paid: cents(paid),
    // Can go negative (over plan). The UI shows that in brass with calm copy, never red.
    stillFlexible: cents(input.budgetTotal - committed),
    funded: cents(funded),
  };
}

export function formatMoney(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
