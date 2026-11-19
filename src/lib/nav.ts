// The menu, built in one place (docs/architecture.md 7a; user-flows/discovery-proposal.md: six pillars with Explore).
export type Role = "owner" | "collaborator" | "funder" | "viewer" | "vendor";
export type MenuItem = { key: string; label: string; href: string; group: "pillar" | "more" };

const DAY_MS = 86_400_000;

export function menuFor(opts: { weddingId: string; role: Role | null; weddingDate: string | null; today: string }): MenuItem[] {
  const base = `/w/${opts.weddingId}`;
  if (opts.role === "funder") {
    // Shorter menu: no guest data, no greyed-out items.
    return [
      { key: "week", label: "This week", href: base, group: "pillar" },
      { key: "budget", label: "Budget", href: `${base}/budget`, group: "pillar" },
      { key: "contribution", label: "My contribution", href: `${base}/together`, group: "pillar" },
      { key: "settings", label: "Settings", href: `${base}/settings`, group: "more" },
      { key: "help", label: "Help & sample wedding", href: "/help", group: "more" },
    ];
  }
  const items: MenuItem[] = [
    { key: "week", label: "This week", href: base, group: "pillar" },
    { key: "explore", label: "Explore", href: `${base}/explore`, group: "pillar" },
    { key: "budget", label: "Budget", href: `${base}/budget`, group: "pillar" },
    { key: "guests", label: "Guests", href: `${base}/guests`, group: "pillar" },
    { key: "vendors", label: "Your vendors", href: `${base}/vendors`, group: "pillar" },
    { key: "plan", label: "Plan", href: `${base}/plan`, group: "pillar" },
  ];
  const daysOut = opts.weddingDate
    ? (Date.parse(`${opts.weddingDate}T12:00:00Z`) - Date.parse(`${opts.today}T12:00:00Z`)) / DAY_MS
    : Infinity;
  if (daysOut <= 92 && daysOut >= -1) {
    items.push({ key: "day", label: "The Day", href: `${base}/plan/day`, group: "pillar" });
  }
  items.push(
    { key: "boards", label: "Boards", href: `${base}/boards`, group: "more" },
    { key: "book", label: "Wedding book", href: `${base}/book`, group: "more" },
    { key: "together", label: "Together", href: `${base}/together`, group: "more" },
    { key: "settings", label: "Settings", href: `${base}/settings`, group: "more" },
    { key: "help", label: "Help & sample wedding", href: "/help", group: "more" },
  );
  return items;
}
