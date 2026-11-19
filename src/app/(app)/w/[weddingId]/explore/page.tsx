import { PageTitle } from "@/components/shell/page-bits";

// Explore: discovery in one place, always tied to the couple's budget, date and location.
// No paid ranking, no sponsored results, no lead forms. Saving never contacts anyone.
const SECTIONS = [
  { title: "Venues", what: "Places near you that host weddings, with budget fit once a price is known." },
  { title: "Vendors near you", what: "Every category, as a list or a map, sorted by distance, budget fit or style. Never by who paid." },
  { title: "What things cost", what: "Local price ranges by category, so you know what's normal before you ask." },
  { title: "Ideas", what: "Inspiration by style, season and color, with a rough sense of cost. Save what you love to Boards." },
  { title: "Guides", what: "Short how-tos for each stage, like comparing caterer quotes." },
];

export default function ExplorePage() {
  return (
    <>
      <PageTitle sub="Find venues, vendors and ideas that fit your budget.">Explore</PageTitle>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <li key={s.title} className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-medium text-text">{s.title}</h2>
            <p className="mt-1 text-sm text-text-muted">{s.what}</p>
            <p className="mt-3 text-xs text-text-muted">Coming in the Explore milestone</p>
          </li>
        ))}
      </ul>
    </>
  );
}
