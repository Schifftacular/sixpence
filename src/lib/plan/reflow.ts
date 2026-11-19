import { addDays } from "@/lib/dates";

/** When the date moves, tasks keep their distance from the wedding, but never land before today. */
export function reflowDue(weddingDate: string, offsetDays: number, today: string): string {
  const d = addDays(weddingDate, offsetDays);
  return d < today ? today : d;
}
