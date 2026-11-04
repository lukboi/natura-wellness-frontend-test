# Natura Wellness frontend test

Natura Wellness is a fictional brand made up for this test. The full brief is in `INSTRUCTIONS.md`.

```
npm install
npm run dev
```

- **Part A:** `src/part-a/SubscriptionCard.tsx`. Open `/?part=a&fixture=active`. The mock API is in `src/api/`; switch cases with `?fixture=active|paused|cancelled|error` and force the "changed elsewhere" error with `&conflict=always`. Other products are in `catalog` in `src/api/fixtures.ts`.
- **Part B:** `src/part-b/BuyBox.tsx`. Open `/?part=b`. Match `public/reference/buy-box.png`, which is a 2x screenshot of a 1200px-wide browser window. Copy is in `src/part-b/copy.ts`; Fraunces and Inter are loaded in `index.html`.

You can add any libraries you like.

## Part A notes

- **Skips in a row are counted per visit.** The API keeps no skip history, so the "you'll skip 2 shipments in a row" warning only knows about skips made since the page loaded. Persisting the count in the browser would be wrong here, because the mock server also resets on reload and the skips themselves disappear. In production the server would return the number of consecutive skips.
- **Server data plus a local layer.** Only skipping exists in the API. Resume, resubscribe, changing frequency, pausing and cancelling are simulated (`src/part-a/localActions.ts`): once one of them is used, the page works from a local copy of the subscription, and later skips on that copy are simulated too. Sending them to the real API would be wrong: it would reject them with a 400 when the server still thinks the subscription is paused or cancelled, and it always moves the date by the server's 30 days, not a locally chosen frequency.
- **Skips can be undone.** After a skip, the card keeps "You skipped your Nov 10 shipment · Undo" for as long as that date is still ahead. Several skips undo one at a time, newest first. There's no "unskip" in the API, so undo runs on the local copy; in production it would be a real backend call. Like the skip count, it lasts for the visit.
- **Desktop follows the product page.** On phones it's one card. From 900px it opens into the buy box's two columns: the shipment's products in a large card on the left, the date, charge and actions on the right. Colors, the selected-option style of the charge box, the badges and the gold sun come from `public/reference/buy-box.png`.
- **Changing frequency moves the upcoming shipment too.** Going from every 30 to every 60 days moves Nov 10 to Dec 10 (the new interval after the last shipment), never earlier than tomorrow. Customers who say they have too much product left want exactly that.

## Part B notes

- **Matched at 1200px against the reference.** Positions and sizes were measured from `public/reference/buy-box.png` (2x) and checked against the rendered page; elements land within about 2px. The photo sits at 500px inside the 540px card, as in the reference. The reference shows five full stars next to 4.8, so that's what's drawn.
- **Everything follows the customer's choices.** Quantity (1–10) multiplies the Add to cart total and the renewal fine print; the option rows keep the per-unit price, as in the reference. Frequency updates the fine print. Choosing one-time collapses the subscription details and hides the fine print; switching back keeps the frequency that was chosen. `copy.finePrint` is written for the default choice, so the frequency and amount are swapped in.
- **Narrower screens.** Two columns down to 900px, then the photo stacks above the details.

## Review toolbar

The dark bar at the top (`src/App.tsx`) is a test harness, not part of either part. It previews either page at Phone 375, Tablet 768 or Desktop 1200 (inside an iframe, so the page's own breakpoints apply), switches Part A's test cases, and for Part B lays the reference screenshot over the page with an opacity slider and a "Difference" mode where matching pixels turn black. The settings live in the URL, e.g. `?part=b&width=1200&overlay=1&opacity=50&diff=1`.

### Cancellation flow

Link → reason → one offer that fits the reason → "Are you sure?" with the consequences → cancelled. Four taps; "Something else" skips the offer (three taps). The decline button is always on the offer screen, the same size as the offer.

| Reason (share of cancellations) | Offer |
|---|---|
| Too much product left (38%) | Ship less often (45/60/90 days, with the next date), or skip the next shipment |
| Costs too much (24%) | Ship less often, with the monthly cost of each option |
| Trying a different product (15%) | Pause for 1–3 months |
| Didn't see results (12%) | Skip the next shipment to decide later. No claims about how long supplements take. |
| Something else (11%) | No offer; optional comment on the confirm screen |

The confirm screen is kept deliberately: an accidental cancel is worse than an accidental skip, and it only lists the consequences.
