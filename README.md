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
- **Changing frequency moves the upcoming shipment too.** Going from every 30 to every 60 days moves Nov 10 to Dec 10 (the new interval after the last shipment), never earlier than tomorrow. Customers who say they have too much product left want exactly that.

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
