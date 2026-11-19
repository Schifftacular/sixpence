// Date helpers on ISO yyyy-mm-dd strings, in UTC so server and browser agree.
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`)) / 86_400_000);
}

/** "9 months to go" until the last 30 days, then days (F2). Never alarming. */
export function countdown(weddingDate: string | null, today: string, estimate = false): string {
  if (!weddingDate) return "Date not set yet";
  const d = daysBetween(today, weddingDate);
  if (d < 0) return "Married";
  if (d === 0) return "Today's the day";
  const tail = estimate ? " (estimated date)" : "";
  if (d <= 30) return `${d} day${d === 1 ? "" : "s"} to go${tail}`;
  const months = Math.round(d / 30.44);
  return `${months} month${months === 1 ? "" : "s"} to go${tail}`;
}

export function shortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function longDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function monthLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
