// Budget split and starter checklist. App assumptions, shown as estimates; tune with real use.

export type CategoryKey =
  | "venue" | "catering" | "photo" | "video" | "music" | "flowers" | "attire"
  | "beauty" | "cake" | "stationery" | "rings" | "officiant" | "transport" | "favors" | "rentals"
  | "planner" | "other";

export type Priority = "food" | "photos" | "music" | "venue" | "attire" | "guest_experience";

/** perGuest: cost scales with guest count (used by the guest-count trade-off, F4). */
export const CATEGORIES: { key: CategoryKey; name: string; share: number; perGuest?: boolean; vendorNoun: string }[] = [
  { key: "venue", name: "Venue", share: 0.28, vendorNoun: "venue" },
  { key: "catering", name: "Food & drink", share: 0.22, perGuest: true, vendorNoun: "caterer" },
  { key: "photo", name: "Photography", share: 0.08, vendorNoun: "photographer" },
  { key: "video", name: "Videography", share: 0.04, vendorNoun: "videographer" },
  { key: "music", name: "Music & DJ", share: 0.04, vendorNoun: "DJ or band" },
  { key: "flowers", name: "Flowers & decor", share: 0.08, vendorNoun: "florist" },
  { key: "attire", name: "Attire", share: 0.06, vendorNoun: "attire shop" },
  { key: "beauty", name: "Hair & makeup", share: 0.02, vendorNoun: "hair and makeup artist" },
  { key: "cake", name: "Cake & desserts", share: 0.02, perGuest: true, vendorNoun: "baker" },
  { key: "stationery", name: "Invitations & paper", share: 0.02, perGuest: true, vendorNoun: "stationer" },
  { key: "rings", name: "Rings", share: 0.03, vendorNoun: "jeweler" },
  { key: "officiant", name: "Officiant", share: 0.01, vendorNoun: "officiant" },
  { key: "transport", name: "Transportation", share: 0.02, vendorNoun: "transportation company" },
  { key: "favors", name: "Favors & gifts", share: 0.01, perGuest: true, vendorNoun: "favor maker" },
  { key: "rentals", name: "Rentals", share: 0.02, perGuest: true, vendorNoun: "rental company" },
  { key: "planner", name: "Planner or coordinator", share: 0.03, vendorNoun: "planner" },
  { key: "other", name: "Cushion", share: 0.02, vendorNoun: "vendor" },
];

export const PRIORITY_CATEGORIES: Record<Priority, CategoryKey[]> = {
  food: ["catering", "cake"],
  photos: ["photo", "video"],
  music: ["music"],
  venue: ["venue", "flowers"],
  attire: ["attire", "beauty"],
  guest_experience: ["favors", "transport", "catering"],
};

export type Stage = "just_engaged" | "venue_booked" | "some_vendors" | "final_stretch";

export type TaskTemplate = {
  key: string;
  title: string;
  /** One line on why it matters (F7). */
  why?: string;
  /** Days relative to the wedding date (negative = before). */
  offsetDays: number;
  category: CategoryKey | "planning" | "guests";
  /** Stages at which this task starts as already done. */
  doneFrom?: Stage[];
};

const AFTER_VENUE: Stage[] = ["venue_booked", "some_vendors", "final_stretch"];
const AFTER_SOME: Stage[] = ["some_vendors", "final_stretch"];
const FINAL: Stage[] = ["final_stretch"];

export const TASKS: TaskTemplate[] = [
  { key: "set_budget", title: "Agree on a budget together", why: "Every other decision gets easier with one number you both trust.", offsetDays: -365, category: "planning", doneFrom: AFTER_SOME },
  { key: "draft_guest_list", title: "Draft your guest list", why: "Guest count drives venue size and most of the cost.", offsetDays: -350, category: "guests", doneFrom: AFTER_SOME },
  { key: "pick_style", title: "Pick a rough style and season", why: "Narrows venues and vendors before you start touring.", offsetDays: -345, category: "planning", doneFrom: AFTER_VENUE },
  { key: "book_venue", title: "Book your venue", why: "Sets your date, and most vendors ask about it first.", offsetDays: -330, category: "venue", doneFrom: AFTER_VENUE },
  { key: "book_planner", title: "Decide if you want a planner or day-of coordinator", offsetDays: -320, category: "planner", doneFrom: AFTER_SOME },
  { key: "book_photo", title: "Book your photographer", why: "The good ones book 10 to 12 months out.", offsetDays: -300, category: "photo", doneFrom: AFTER_SOME },
  { key: "book_catering", title: "Book catering", why: "Often the biggest bill after the venue.", offsetDays: -290, category: "catering", doneFrom: AFTER_SOME },
  { key: "wedding_website", title: "Set up a simple wedding website or info page", offsetDays: -280, category: "guests", doneFrom: FINAL },
  { key: "book_music", title: "Book music or a DJ", offsetDays: -270, category: "music", doneFrom: AFTER_SOME },
  { key: "book_video", title: "Decide on videography", offsetDays: -260, category: "video", doneFrom: FINAL },
  { key: "save_the_dates", title: "Send save-the-dates", why: "Gives travelling guests time to plan.", offsetDays: -240, category: "stationery", doneFrom: FINAL },
  { key: "book_officiant", title: "Choose your officiant", offsetDays: -240, category: "officiant", doneFrom: AFTER_SOME },
  { key: "attire", title: "Find your wedding attire", why: "Alterations take two to three months.", offsetDays: -240, category: "attire", doneFrom: FINAL },
  { key: "book_florist", title: "Book your florist", offsetDays: -210, category: "flowers", doneFrom: FINAL },
  { key: "hotel_block", title: "Set up a hotel block for guests", offsetDays: -210, category: "guests", doneFrom: FINAL },
  { key: "book_rentals", title: "Sort out rentals (tables, chairs, linens)", offsetDays: -200, category: "rentals", doneFrom: FINAL },
  { key: "book_beauty", title: "Book hair and makeup", offsetDays: -180, category: "beauty", doneFrom: FINAL },
  { key: "registry", title: "Start a registry or cash fund (optional)", offsetDays: -180, category: "guests", doneFrom: FINAL },
  { key: "order_cake", title: "Choose your cake", offsetDays: -150, category: "cake", doneFrom: FINAL },
  { key: "plan_rehearsal", title: "Plan the rehearsal dinner", offsetDays: -120, category: "planning", doneFrom: FINAL },
  { key: "transport", title: "Arrange transportation", offsetDays: -120, category: "transport", doneFrom: FINAL },
  { key: "order_invites", title: "Order invitations", offsetDays: -110, category: "stationery", doneFrom: FINAL },
  { key: "send_invites", title: "Send invitations", why: "Six to eight weeks ahead is the usual.", offsetDays: -75, category: "stationery", doneFrom: FINAL },
  { key: "favors", title: "Decide on favors (or skip them)", offsetDays: -75, category: "favors", doneFrom: FINAL },
  { key: "rings", title: "Buy your rings", offsetDays: -60, category: "rings", doneFrom: FINAL },
  { key: "vows", title: "Write your vows", offsetDays: -45, category: "planning" },
  { key: "marriage_license", title: "Get your marriage license", why: "Check your county's waiting period and expiry.", offsetDays: -30, category: "planning" },
  { key: "chase_rsvps", title: "Follow up with guests who haven't replied", offsetDays: -25, category: "guests" },
  { key: "final_headcount", title: "Give caterer the final headcount", offsetDays: -14, category: "catering" },
  { key: "seating", title: "Finish the seating chart", offsetDays: -14, category: "guests" },
  { key: "final_payments", title: "Make final vendor payments", offsetDays: -7, category: "planning" },
  { key: "day_of_timeline", title: "Share the day-of timeline", why: "Vendors and the wedding party all work from one schedule.", offsetDays: -7, category: "planning" },
  { key: "tip_envelopes", title: "Prepare tip envelopes", offsetDays: -3, category: "planning" },
  { key: "thank_yous", title: "Send thank-you notes", offsetDays: 60, category: "guests" },
];

export function categoryName(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.name ?? key;
}
export function vendorNoun(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.vendorNoun ?? "vendor";
}
