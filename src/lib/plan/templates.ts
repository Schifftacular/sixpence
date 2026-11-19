// Budget split and starter checklist. App assumptions, shown as estimates; tune with real use.

export type CategoryKey =
  | "venue" | "catering" | "photo" | "video" | "music" | "flowers" | "attire"
  | "beauty" | "cake" | "stationery" | "rings" | "officiant" | "transport" | "favors" | "other";

export type Priority = "food" | "photos" | "music" | "venue" | "attire" | "guest_experience";

export const CATEGORIES: { key: CategoryKey; name: string; share: number }[] = [
  { key: "venue", name: "Venue", share: 0.3 },
  { key: "catering", name: "Food & drink", share: 0.24 },
  { key: "photo", name: "Photography", share: 0.08 },
  { key: "video", name: "Videography", share: 0.04 },
  { key: "music", name: "Music & DJ", share: 0.04 },
  { key: "flowers", name: "Flowers & decor", share: 0.08 },
  { key: "attire", name: "Attire", share: 0.06 },
  { key: "beauty", name: "Hair & makeup", share: 0.02 },
  { key: "cake", name: "Cake & desserts", share: 0.02 },
  { key: "stationery", name: "Invitations & paper", share: 0.02 },
  { key: "rings", name: "Rings", share: 0.03 },
  { key: "officiant", name: "Officiant", share: 0.01 },
  { key: "transport", name: "Transportation", share: 0.02 },
  { key: "favors", name: "Favors & gifts", share: 0.01 },
  { key: "other", name: "Cushion", share: 0.03 },
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
  { key: "set_budget", title: "Agree on a budget together", offsetDays: -365, category: "planning" },
  { key: "draft_guest_list", title: "Draft your guest list", offsetDays: -350, category: "guests" },
  { key: "book_venue", title: "Book your venue", offsetDays: -330, category: "venue", doneFrom: AFTER_VENUE },
  { key: "book_photo", title: "Book your photographer", offsetDays: -300, category: "photo", doneFrom: AFTER_SOME },
  { key: "book_catering", title: "Book catering", offsetDays: -290, category: "catering", doneFrom: AFTER_SOME },
  { key: "book_music", title: "Book music or a DJ", offsetDays: -270, category: "music", doneFrom: AFTER_SOME },
  { key: "save_the_dates", title: "Send save-the-dates", offsetDays: -240, category: "stationery", doneFrom: FINAL },
  { key: "book_officiant", title: "Choose your officiant", offsetDays: -240, category: "officiant", doneFrom: AFTER_SOME },
  { key: "attire", title: "Find your wedding attire", offsetDays: -240, category: "attire", doneFrom: FINAL },
  { key: "book_florist", title: "Book your florist", offsetDays: -210, category: "flowers", doneFrom: FINAL },
  { key: "hotel_block", title: "Set up a hotel block for guests", offsetDays: -210, category: "guests", doneFrom: FINAL },
  { key: "book_beauty", title: "Book hair and makeup", offsetDays: -180, category: "beauty", doneFrom: FINAL },
  { key: "order_cake", title: "Choose your cake", offsetDays: -150, category: "cake", doneFrom: FINAL },
  { key: "transport", title: "Arrange transportation", offsetDays: -120, category: "transport", doneFrom: FINAL },
  { key: "send_invites", title: "Send invitations", offsetDays: -75, category: "stationery", doneFrom: FINAL },
  { key: "rings", title: "Buy your rings", offsetDays: -60, category: "rings", doneFrom: FINAL },
  { key: "marriage_license", title: "Get your marriage license", offsetDays: -30, category: "planning" },
  { key: "final_headcount", title: "Give caterer the final headcount", offsetDays: -14, category: "catering" },
  { key: "seating", title: "Finish the seating chart", offsetDays: -14, category: "guests" },
  { key: "final_payments", title: "Make final vendor payments", offsetDays: -7, category: "planning" },
  { key: "day_of_timeline", title: "Share the day-of timeline", offsetDays: -7, category: "planning" },
];
