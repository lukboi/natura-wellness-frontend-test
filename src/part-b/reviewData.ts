// Sample reviews for the bonus reviews section. Fictional, like the brand.
// The breakdown adds up to the 2,316 reviews in copy.ts and averages 4.8:
// (1945*5 + 278*4 + 58*3 + 21*2 + 14*1) / 2316 = 4.78.

export const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
  5: 1945,
  4: 278,
  3: 58,
  2: 21,
  1: 14,
};

export interface Review {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  author: string;
  /** ISO date */
  date: string;
  subscriber: boolean;
}

export const reviews: Review[] = [
  {
    id: "r1",
    rating: 5,
    title: "Small, easy softgels",
    body: "I've tried a few brands and these are the easiest to swallow. No aftertaste, and one a day with breakfast is simple to stick to.",
    author: "Maya R.",
    date: "2026-10-28",
    subscriber: true,
  },
  {
    id: "r2",
    rating: 5,
    title: "The subscription just works",
    body: "Arrives right before I run out. I skipped a month when I was travelling and it took two taps.",
    author: "Daniel K.",
    date: "2026-10-19",
    subscriber: true,
  },
  {
    id: "r3",
    rating: 4,
    title: "Good, wish there was a bigger bottle",
    body: "Quality feels great and the label is clear about the dose. I'd love a 120-count bottle so I could get it less often.",
    author: "Priya S.",
    date: "2026-10-11",
    subscriber: false,
  },
  {
    id: "r4",
    rating: 5,
    title: "Part of my morning now",
    body: "Clean ingredient list, nothing I can't pronounce. The bottle looks nice on the counter, which honestly helps me remember.",
    author: "Tom W.",
    date: "2026-09-30",
    subscriber: true,
  },
  {
    id: "r5",
    rating: 3,
    title: "Fine, but pricey one-time",
    body: "The product is good. It only made sense for me once I switched to the subscription and saved the 15%.",
    author: "Leah M.",
    date: "2026-09-22",
    subscriber: false,
  },
  {
    id: "r6",
    rating: 5,
    title: "Ordered for the whole family",
    body: "We get three bottles every 60 days now. Shipping has always been on time.",
    author: "Carlos A.",
    date: "2026-09-14",
    subscriber: true,
  },
  {
    id: "r7",
    rating: 4,
    title: "Solid everyday vitamin",
    body: "Does what it says. Softgels are a bit glossy so they stick together if the bottle gets warm.",
    author: "Hannah B.",
    date: "2026-08-30",
    subscriber: false,
  },
  {
    id: "r8",
    rating: 2,
    title: "Lid arrived cracked",
    body: "The bottle came with a cracked cap. Support sent a new one within the week, but I'd like better packaging.",
    author: "Owen P.",
    date: "2026-08-21",
    subscriber: false,
  },
  {
    id: "r9",
    rating: 5,
    title: "No more remembering to reorder",
    body: "I kept forgetting to buy vitamins. Now they just show up, and I can push a delivery back if I still have some left.",
    author: "Grace L.",
    date: "2026-08-09",
    subscriber: true,
  },
  {
    id: "r10",
    rating: 1,
    title: "Not for me",
    body: "Nothing wrong with the product, I just prefer a liquid. Cancelling was quick, at least.",
    author: "Ben T.",
    date: "2026-07-27",
    subscriber: false,
  },
];
