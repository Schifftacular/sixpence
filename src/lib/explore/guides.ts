// Short in-house guides. Plain advice, no affiliate links, nothing sponsored.
export type Guide = { slug: string; title: string; stage: string; minutes: number; summary: string; category?: string; sections: { heading: string; body?: string; list?: string[] }[] };

export const GUIDES: Guide[] = [
  {
    slug: "first-month", title: "Your first month engaged", stage: "Just engaged", minutes: 4,
    summary: "Three decisions unlock almost everything else: rough guest count, rough budget, and a season.",
    sections: [
      { heading: "Start with three numbers", body: "You don't need a date or a venue yet. A rough guest count, a rough total and a season are enough to plan around. All three can change later." },
      { heading: "Have the money talk early", list: ["Decide what the two of you can put in.", "Ask family if they want to help, and whether it comes with expectations.", "Write it down in Budget under Who's paying so nobody has to remember."] },
      { heading: "Then look at venues", body: "The venue sets your date, your guest limit and about a quarter to a third of your budget. Most other vendors are booked after it." },
    ],
  },
  {
    slug: "venue-questions", title: "Questions to ask a venue", stage: "Finding a venue", minutes: 5, category: "venue",
    summary: "The price on the website is rarely the full price. These questions get you a number you can compare.",
    sections: [
      { heading: "Get the real price", list: ["What's the total for our date and guest count, with tax and service fees?", "What's included: tables, chairs, linens, setup, cleanup, a coordinator?", "Is there a food and drink minimum, and does it include tax and tip?", "Do we have to use your caterer or a list of approved vendors?"] },
      { heading: "Check the practical things", list: ["What's the rain plan, and what does it look like?", "When can vendors arrive, and when do we have to be out?", "Is there parking, or do we need a shuttle?", "What's the deposit and when are the payments due?"] },
      { heading: "Then compare in Sixpence", body: "Add each venue's price as a quote. Your vendors lines them up side by side and shows how each fits your plan." },
    ],
  },
  {
    slug: "compare-caterer-quotes", title: "How to compare caterer quotes", stage: "Booking vendors", minutes: 4, category: "catering",
    summary: "Per-guest prices hide a lot. Here's how to turn them into numbers you can compare.",
    sections: [
      { heading: "Turn everything into a total", body: "Multiply the per-guest price by your guest count, then add service charge, tax, staffing, rentals and cake cutting fees if they're separate. Sixpence does the multiplying for you when you enter a per-guest quote." },
      { heading: "Ask the same questions of each", list: ["How many servers and bartenders for our size?", "Are plates, glasses and linens included?", "Is the tip included in the service charge?", "What happens to the price if our guest count changes?"] },
      { heading: "Remember the guest count", body: "Catering moves the most when your guest list changes. Try the guest what-if in Budget to see the effect before you commit." },
    ],
  },
  {
    slug: "payment-schedules", title: "Understanding payment schedules", stage: "Booking vendors", minutes: 3,
    summary: "Most vendors take a deposit to hold your date and the rest close to the wedding. Plan the cash, not just the total.",
    sections: [
      { heading: "The usual pattern", list: ["A deposit of 25 to 50 percent when you sign.", "Sometimes a middle payment a few months out.", "The balance one to four weeks before the wedding."] },
      { heading: "Watch the last month", body: "Several balances often land in the same few weeks. Budget's Coming up chart shows the cash you'll need month by month so it isn't a surprise." },
      { heading: "Keep the contract terms", body: "Note refund and cancellation terms in the vendor's notes. If plans change, that's what you'll need." },
    ],
  },
  {
    slug: "guest-list", title: "Building the guest list without the fights", stage: "Guests", minutes: 4,
    summary: "Agree on the rules before the names. It's easier to apply a rule than to argue about a person.",
    sections: [
      { heading: "Agree on rules first", list: ["Plus-ones: for everyone, for long-term partners, or for nobody?", "Kids: invited, only family, or adults only?", "Coworkers and parents' friends: who decides?"] },
      { heading: "Work in households", body: "Invitations go to households, so that's how Sixpence keeps the list. Add a household with the names in one line, like Ana and Luis Perez." },
      { heading: "Know the cost of each name", body: "Guests shows roughly what one more guest adds, based on your per-guest categories." },
    ],
  },
  {
    slug: "final-month", title: "The last month, calmly", stage: "Final stretch", minutes: 4,
    summary: "Confirm, don't add. The last month is for confirming what you already decided.",
    sections: [
      { heading: "Four weeks out", list: ["Give your caterer and venue the final guest count.", "Confirm arrival times with every vendor.", "Draft the day's timeline in Plan and share it with your wedding party."] },
      { heading: "One week out", list: ["Pay any remaining balances and mark them paid.", "Prepare tip envelopes with names.", "Hand one trusted person the vendor list and phone numbers."] },
      { heading: "On the day", body: "Your phone is not the plan. The person you handed the list to is." },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;
