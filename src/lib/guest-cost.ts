// Guest count <-> cost trade-off (F4). Pure: nothing is saved until the couple taps Apply.
export type CostCategory = { id: string; key: string; name: string; planned: number; perGuest: boolean };
export type PerGuestQuote = { categoryKey: string; perGuestAmount: number; booked: boolean };

export type WhatIf = {
  guests: number;
  categories: (CostCategory & { newPlanned: number })[];
  plannedDelta: number;
  committedDelta: number;
  newStillFlexible: number;
};

const r50 = (n: number) => Math.round(n / 50) * 50;

export function guestWhatIf(opts: {
  categories: CostCategory[];
  quotes: PerGuestQuote[];
  currentGuests: number;
  newGuests: number;
  total: number;
  committed: number;
}): WhatIf {
  const { categories, quotes, currentGuests, newGuests, total, committed } = opts;
  const ratio = currentGuests > 0 ? newGuests / currentGuests : 1;
  let committedDelta = 0;
  const cats = categories.map((c) => {
    if (!c.perGuest) return { ...c, newPlanned: c.planned };
    const booked = quotes.find((q) => q.categoryKey === c.key && q.booked);
    if (booked) {
      const delta = booked.perGuestAmount * (newGuests - currentGuests);
      committedDelta += delta;
      return { ...c, newPlanned: Math.max(0, r50(c.planned + delta)) };
    }
    return { ...c, newPlanned: r50(c.planned * ratio) };
  });
  const plannedDelta = cats.reduce((a, c) => a + (c.newPlanned - c.planned), 0);
  return {
    guests: newGuests,
    categories: cats,
    plannedDelta,
    committedDelta: Math.round(committedDelta * 100) / 100,
    newStillFlexible: Math.round((total - committed - committedDelta) * 100) / 100,
  };
}

/** "about $142 per guest for food and drink". */
export function perGuestFood(categories: CostCategory[], guests: number): number | null {
  const food = categories.find((c) => c.key === "catering");
  if (!food || guests <= 0) return null;
  return Math.round(food.planned / guests);
}
