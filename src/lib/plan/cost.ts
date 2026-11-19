// National wedding cost model. Facts: The Knot 2026 Real Weddings Study (couples married in 2025):
// average $34,200 for 117 guests; by guest count $17,100 (1-50), $27,200 (51-100), $43,300 (100+).
// https://www.theknot.com/content/average-wedding-cost
// The fit and the range multipliers below are app assumptions, always shown as estimates.
// Local adjustment (BEA RPP, BLS OEWS, CPI) replaces this once the data ETL lands (docs/architecture.md 5).

export const COST_SOURCE = {
  name: "The Knot 2026 Real Weddings Study",
  url: "https://www.theknot.com/content/average-wedding-cost",
  year: 2026,
} as const;

// Linear fit through the guest-band averages (band midpoints ~35 and ~150 guests).
const FIXED = 9_120;
const PER_GUEST = 228;

export type CostRange = { low: number; typical: number; high: number };

export function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}

/** Modeled mean total for a guest count, national, current dollars. */
export function modeledMean(guests: number): number {
  const g = Math.max(10, Math.min(400, guests));
  return FIXED + PER_GUEST * g;
}

/** "Help me find one": low 0.7x, typical 0.9x, high 1.4x of the modeled mean (averages skew high). */
export function costRange(guests: number): CostRange {
  const mean = modeledMean(guests);
  return {
    low: roundTo(mean * 0.7, 500),
    typical: roundTo(mean * 0.9, 500),
    high: roundTo(mean * 1.4, 500),
  };
}
