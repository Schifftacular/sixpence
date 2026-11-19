// Ideas by style. Written in-house: general, budget-aware suggestions, not anyone's real wedding.
// Photos come from Unsplash only when UNSPLASH_ACCESS_KEY is set, always with the photographer's credit.
export type Style = { key: string; name: string; query: string; ideas: { title: string; cost: "saves" | "similar" | "adds"; note: string; category: string }[] };

export const STYLES: Style[] = [
  { key: "garden", name: "Garden", query: "garden wedding", ideas: [
    { title: "Potted herbs as centerpieces", cost: "saves", category: "flowers", note: "Rosemary and lavender in clay pots; guests take them home as favors." },
    { title: "Ceremony under an existing tree", cost: "saves", category: "flowers", note: "A good tree or arbor means you need far less ceremony decor." },
    { title: "Loose, seasonal bouquets", cost: "similar", category: "flowers", note: "Ask your florist what's in season that month; it's usually the best value." },
  ] },
  { key: "rustic", name: "Rustic and barn", query: "barn wedding", ideas: [
    { title: "Long family-style tables", cost: "similar", category: "rentals", note: "Fewer, longer tables; ask your caterer if family-style service costs more than plated." },
    { title: "String lights over the dance floor", cost: "adds", category: "rentals", note: "Often rented with the venue. Ask what's included before buying your own." },
    { title: "Pie or donut table instead of a tall cake", cost: "saves", category: "cake", note: "A small cutting cake plus a local bakery's pies." },
  ] },
  { key: "mountain", name: "Mountain", query: "mountain wedding", ideas: [
    { title: "Golden-hour portraits at an overlook", cost: "similar", category: "photo", note: "Plan 30 minutes and travel time with your photographer." },
    { title: "Shuttle for guests on winding roads", cost: "adds", category: "transport", note: "Safer after the party, and venues with limited parking often require it." },
    { title: "Blankets as favors for a cool evening", cost: "adds", category: "favors", note: "Useful and memorable; a basket by the fire pit works too." },
  ] },
  { key: "modern", name: "Modern and minimal", query: "minimalist wedding", ideas: [
    { title: "One statement flower per table", cost: "saves", category: "flowers", note: "Single stems in bud vases look intentional and cost less than full arrangements." },
    { title: "Printed seating chart on a big board", cost: "saves", category: "stationery", note: "One large print replaces dozens of escort cards." },
    { title: "Late-night food truck", cost: "adds", category: "catering", note: "Guests remember it. Ask if your venue allows outside vendors." },
  ] },
  { key: "classic", name: "Classic", query: "classic elegant wedding", ideas: [
    { title: "Candlelit reception", cost: "similar", category: "rentals", note: "Check the venue's open-flame rules; LED candles are a fine stand-in." },
    { title: "A string trio for the ceremony", cost: "adds", category: "music", note: "Ceremony-only bookings are often cheaper than a full evening." },
    { title: "Letterpress invitations, digital everything else", cost: "similar", category: "stationery", note: "Spend on the one piece people keep; send save-the-dates and RSVPs online." },
  ] },
  { key: "boho", name: "Boho", query: "boho wedding", ideas: [
    { title: "Dried and pampas florals", cost: "saves", category: "flowers", note: "They can be made ahead and don't wilt, which helps for outdoor weddings." },
    { title: "Lounge areas with rugs and floor cushions", cost: "adds", category: "rentals", note: "Rent a few pieces for one corner rather than the whole room." },
    { title: "Flower crowns for the wedding party", cost: "similar", category: "flowers", note: "Ask your florist to make them, or host a crown-making hour the day before." },
  ] },
];

export const COST_WORD = { saves: "Usually saves money", similar: "About the same cost", adds: "Adds a little" } as const;

export type Photo = { id: string; url: string; thumb: string; alt: string; credit: string; creditUrl: string; pageUrl: string };

/** Unsplash search, server-side. Returns null when no key is configured, so the UI can say so honestly. */
export async function searchPhotos(query: string): Promise<Photo[] | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const utm = "utm_source=sixpence&utm_medium=referral";
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=18&orientation=portrait&content_filter=high`, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results: { id: string; alt_description: string | null; urls: { regular: string; small: string }; links: { html: string }; user: { name: string; links: { html: string } } }[] };
    return json.results.map((r) => ({
      id: r.id, url: r.urls.regular, thumb: r.urls.small, alt: r.alt_description ?? query,
      credit: `Photo by ${r.user.name} on Unsplash`, creditUrl: `${r.user.links.html}?${utm}`, pageUrl: `${r.links.html}?${utm}`,
    }));
  } catch {
    return [];
  }
}
