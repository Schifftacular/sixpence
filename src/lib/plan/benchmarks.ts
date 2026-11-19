import { costRange, roundTo, COST_SOURCE } from "./cost";
import { CATEGORIES } from "./templates";

// Typical cost per category for a guest count: the national typical total split by category share.
// Range is 0.6x to 1.6x of typical (category prices vary more than totals). National figures for now;
// a local price adjustment (BEA regional price parities) replaces the 1.0 factor once the cost ETL lands.
export type Benchmark = { low: number; typical: number; high: number };

export const BENCHMARK_NOTE = `National ${COST_SOURCE.year} survey figures (${COST_SOURCE.name}) for your guest count. Local price adjustment is coming.`;

export function categoryBenchmark(key: string, guests: number, localFactor = 1): Benchmark | null {
  const cat = CATEGORIES.find((c) => c.key === key);
  if (!cat || key === "other") return null;
  const typical = costRange(guests).typical * cat.share * localFactor;
  return { low: roundTo(typical * 0.6, 50), typical: roundTo(typical, 50), high: roundTo(typical * 1.6, 50) };
}

/** Neutral note when the plan sits outside the typical range. Never a warning. */
export function benchmarkNote(planned: number, b: Benchmark | null): string | null {
  if (!b || planned <= 0) return null;
  if (planned > b.high) return "Higher than most weddings this size, which is fine if this matters most to you.";
  if (planned < b.low) return "Lower than most weddings this size. Worth a check once quotes come in.";
  return null;
}
