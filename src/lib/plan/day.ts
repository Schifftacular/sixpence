// The day's timeline (F8). A draft built from the ceremony time and booked vendors' arrival times.
export type DayEvent = { startsAt: string; endsAt?: string | null; title: string; location?: string | null; owner?: string | null; vendorId?: string | null };

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const toTime = (m: number) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };

const ARRIVE: Record<string, { before: number; title: string }> = {
  beauty: { before: 300, title: "Hair and makeup start" },
  photo: { before: 150, title: "Photographer arrives" },
  video: { before: 150, title: "Videographer arrives" },
  flowers: { before: 240, title: "Florist delivers and sets up" },
  rentals: { before: 300, title: "Rentals delivered" },
  catering: { before: 180, title: "Catering team arrives" },
  music: { before: 90, title: "DJ or band sets up" },
  officiant: { before: 45, title: "Officiant arrives" },
  cake: { before: 120, title: "Cake delivered" },
  transport: { before: 60, title: "Shuttle starts" },
};

/** "16:30" ceremony → a full draft run-of-show. Vendor arrival times win over the defaults. */
export function draftDay(ceremony: string, vendors: { id: string; name: string; category_key: string; arrival_time: string | null }[]): DayEvent[] {
  const c = toMin(ceremony);
  const ev: DayEvent[] = [
    { startsAt: toTime(c - 60), title: "Wedding party ready for photos", owner: "Wedding party" },
    { startsAt: toTime(c - 15), title: "Guests take their seats" },
    { startsAt: toTime(c), endsAt: toTime(c + 30), title: "Ceremony" },
    { startsAt: toTime(c + 30), endsAt: toTime(c + 90), title: "Cocktail hour and family photos" },
    { startsAt: toTime(c + 90), title: "Grand entrance" },
    { startsAt: toTime(c + 105), endsAt: toTime(c + 165), title: "Dinner" },
    { startsAt: toTime(c + 165), title: "Toasts" },
    { startsAt: toTime(c + 180), title: "First dance, then the dance floor opens" },
    { startsAt: toTime(c + 225), title: "Cake cutting" },
    { startsAt: toTime(c + 330), title: "Send-off" },
  ];
  for (const v of vendors) {
    const a = ARRIVE[v.category_key];
    if (!a && !v.arrival_time) continue;
    ev.push({ startsAt: v.arrival_time ?? toTime(c - (a?.before ?? 120)), title: a ? `${a.title}: ${v.name}` : `${v.name} arrives`, vendorId: v.id, owner: v.name });
  }
  return ev.sort((x, y) => toMin(x.startsAt) - toMin(y.startsAt));
}

export function timeLabel(t: string): string {
  const m = toMin(t);
  const h = Math.floor(m / 60), mm = m % 60;
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}
