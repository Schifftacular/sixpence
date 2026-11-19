// Quick add (F6): one line per household, typed the way people write invitations.
// "Ana & Luis Pérez" · "Maya Chen +1" · "Tom and Priya Shah (kids: Leo, Mia)" · "Grandma Rose"
export type ParsedGuest = { firstName: string; lastName: string | null; isChild: boolean; isPlusOne: boolean };
export type ParsedHousehold = { name: string; plusOneAllowed: boolean; guests: ParsedGuest[] };

const PLUS_ONE = /\s*(\+\s*1|\bplus\s*one\b|\band\s+guest\b|&\s*guest\b)\s*$/i;

export function parseHousehold(raw: string): ParsedHousehold | null {
  let line = raw.replace(/\s+/g, " ").trim().replace(/^[-*•\d.)\s]+/, "");
  if (!line) return null;
  let kids: string[] = [];
  const kidMatch = line.match(/\((?:kids?|children)\s*:?\s*([^)]*)\)/i);
  if (kidMatch) {
    kids = kidMatch[1].split(/,|&|\band\b/i).map((s) => s.trim()).filter(Boolean);
    line = line.replace(kidMatch[0], "").trim();
  }
  let plusOne = false;
  if (PLUS_ONE.test(line)) { plusOne = true; line = line.replace(PLUS_ONE, "").trim(); }
  const familyMatch = line.match(/^the\s+(.+?)\s+family$/i);
  const parts = familyMatch ? [] : line.split(/\s*(?:&|\band\b|,)\s*/i).map((s) => s.trim()).filter(Boolean);
  const words = parts.map((p) => p.split(" "));
  // Shared last name: "Ana & Luis Pérez" -> both Pérez. Taken from the last person if earlier ones are one word.
  const last = words.length ? (words[words.length - 1].length > 1 ? words[words.length - 1].slice(1).join(" ") : null) : null;
  const guests: ParsedGuest[] = words.map((w) => ({ firstName: w[0], lastName: w.length > 1 ? w.slice(1).join(" ") : last, isChild: false, isPlusOne: false }));
  if (familyMatch) guests.push({ firstName: familyMatch[1], lastName: null, isChild: false, isPlusOne: false });
  for (const k of kids) guests.push({ firstName: k.split(" ")[0], lastName: k.split(" ").slice(1).join(" ") || last, isChild: true, isPlusOne: false });
  if (plusOne) guests.push({ firstName: "Guest", lastName: null, isChild: false, isPlusOne: true });
  if (!guests.length) return null;
  const name = familyMatch ? `The ${familyMatch[1]} family` : line;
  return { name: name.slice(0, 200), plusOneAllowed: plusOne, guests };
}

export function parseList(text: string): ParsedHousehold[] {
  return text.split(/\r?\n/).map((l) => l.split("\t")[0]).map(parseHousehold).filter((h): h is ParsedHousehold => !!h).slice(0, 500);
}

export type RsvpCounts = { households: number; guests: number; yes: number; no: number; waiting: number; kids: number; responded: number };
export function rsvpCounts(households: { responded_at: string | null; guests: { attending: boolean | null; is_child: boolean }[] }[]): RsvpCounts {
  const g = households.flatMap((h) => h.guests);
  return {
    households: households.length,
    guests: g.length,
    yes: g.filter((x) => x.attending === true).length,
    no: g.filter((x) => x.attending === false).length,
    waiting: g.filter((x) => x.attending == null).length,
    kids: g.filter((x) => x.is_child).length,
    responded: households.filter((h) => h.responded_at).length,
  };
}

const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function guestsCsv(households: { name: string; side: string | null; group_name: string | null; email: string | null; address: string | null; guests: { first_name: string; last_name: string | null; is_child: boolean; attending: boolean | null; meal: string | null; dietary: string | null }[] }[]): string {
  const rows = [["Household", "First name", "Last name", "Child", "RSVP", "Meal", "Dietary", "Side", "Group", "Email", "Address"]];
  for (const h of households) for (const g of h.guests) {
    rows.push([h.name, g.first_name, g.last_name ?? "", g.is_child ? "yes" : "", g.attending == null ? "waiting" : g.attending ? "yes" : "no", g.meal ?? "", g.dietary ?? "", h.side ?? "", h.group_name ?? "", h.email ?? "", h.address ?? ""]);
  }
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}
