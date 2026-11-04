import { useEffect, useId, useRef, useState } from "react";
import { copy } from "./copy";
import { Reviews } from "./Reviews";
import "./buybox.css";

// Part B: rebuild of public/reference/buy-box.png. Everything shown follows the customer's choices:
// purchase option, delivery frequency and quantity.

type Plan = "subscribe" | "once";

const MIN_QTY = 1;
const MAX_QTY = 10;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function BuyBox() {
  const [plan, setPlan] = useState<Plan>("subscribe");
  const [frequency, setFrequency] = useState(copy.subscribe.frequencyOptions[0]);
  const [qty, setQty] = useState(1);
  // One polite message for screen readers after a quantity change, instead of two live regions.
  const [status, setStatus] = useState("");
  // Reviews start closed so the page is exactly the reference screenshot (a taller page would add a
  // scrollbar and shift the pixel overlay). A link to #reviews opens them straight away.
  const [reviewsOpen, setReviewsOpen] = useState(() => window.location.hash === "#reviews");
  // Where focus goes once the section has opened or closed (an effect runs after the DOM updates).
  const reviewsFocus = useRef<"open" | "close" | null>(null);
  const reviewsLinkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const target = reviewsFocus.current;
    reviewsFocus.current = null;
    if (target === "open") {
      const heading = document.getElementById("reviews-title");
      heading?.scrollIntoView({ block: "start" });
      heading?.focus({ preventScroll: true });
    } else if (target === "close") {
      reviewsLinkRef.current?.focus();
    }
  }, [reviewsOpen]);
  // A link to #reviews opens them, also when only the hash changes (no page reload).
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#reviews") openReviews();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  });
  function openReviews() {
    reviewsFocus.current = "open";
    if (reviewsOpen) {
      // Already open: the effect won't re-run, so move there directly.
      const heading = document.getElementById("reviews-title");
      heading?.scrollIntoView({ block: "start" });
      heading?.focus({ preventScroll: true });
      reviewsFocus.current = null;
    } else setReviewsOpen(true);
  }
  const groupName = useId();
  const freqId = useId();

  const unitCents = plan === "subscribe" ? copy.subscribe.priceCents : copy.oneTime.priceCents;
  const totalCents = unitCents * qty;

  // copy.finePrint is written for the default (30 days, $25.46). Swap in the customer's choices so it
  // always matches what they'll actually be charged.
  // Functional update, so fast repeated clicks each count (a stale qty would make them all land on +1).
  const qtyChanged = useRef(false);
  function changeQty(delta: number) {
    qtyChanged.current = true;
    setQty((q) => Math.min(MAX_QTY, Math.max(MIN_QTY, q + delta)));
  }
  useEffect(() => {
    if (qtyChanged.current) setStatus(`Quantity ${qty}. Total ${money(totalCents)}.`);
    qtyChanged.current = false;
  }, [qty, totalCents]);

  const finePrint = copy.finePrint
    .replace(copy.subscribe.frequencyOptions[0], frequency)
    .replace(money(copy.subscribe.priceCents), money(totalCents));

  return (
    <main className="bb-page">
      <ProductJsonLd />
      <div className="bb-ref" aria-hidden="true" />
      <div className="bb">
        <div className="bb-media">
          <img
            src="/product.jpg"
            alt="Bottle of Natura Wellness Vitamin D, 60 softgels"
            width={1024}
            height={1024}
            fetchPriority="high"
          />
        </div>

        <div className="bb-info">
          <p className="bb-eyebrow">{copy.eyebrow}</p>
          <div className="bb-rating">
            <Stars />
            <span className="bb-rating__score" aria-hidden="true">
              {copy.rating}
            </span>
            <a
              ref={reviewsLinkRef}
              className="bb-rating__count"
              href="#reviews"
              aria-expanded={reviewsOpen}
              aria-controls="reviews"
              onClick={(e) => {
                e.preventDefault();
                openReviews();
              }}
            >
              {copy.reviewCount}
            </a>
          </div>
          <h1 className="bb-title">{copy.title}</h1>
          <p className="bb-subtitle">{copy.subtitle}</p>

          <fieldset className="bb-options">
            <legend className="bb-visually-hidden">Purchase option</legend>

            <label className={`bb-option${plan === "once" ? " is-selected" : ""}`}>
              <span className="bb-option__head">
                <input
                  type="radio"
                  className="bb-radio"
                  name={groupName}
                  checked={plan === "once"}
                  onChange={() => setPlan("once")}
                />
                <span className="bb-option__label">{copy.oneTime.label}</span>
                <span className="bb-option__price">
                  <strong>{money(copy.oneTime.priceCents)}</strong>
                </span>
              </span>
            </label>

            <div className={`bb-option bb-option--sub${plan === "subscribe" ? " is-selected" : ""}`}>
              <label className="bb-option__head">
                <input
                  type="radio"
                  className="bb-radio"
                  name={groupName}
                  checked={plan === "subscribe"}
                  onChange={() => setPlan("subscribe")}
                />
                <span className="bb-option__label">
                  {copy.subscribe.label}
                  <span className="bb-badge">{copy.subscribe.badge}</span>
                </span>
                <span className="bb-option__price">
                  <strong>{money(copy.subscribe.priceCents)}</strong>
                  <s>
                    <span className="bb-visually-hidden">was </span>
                    {money(copy.subscribe.comparePriceCents)}
                  </s>
                </span>
              </label>

              {plan === "subscribe" && (
                <div className="bb-option__body">
                  <div className="bb-frequency">
                    <label htmlFor={freqId}>{copy.subscribe.frequencyLabel}</label>
                    <span className="bb-select">
                      <select id={freqId} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                        {copy.subscribe.frequencyOptions.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                      <Chevron />
                    </span>
                  </div>
                  <ul className="bb-perks">
                    {copy.subscribe.perks.map((p) => (
                      <li key={p}>
                        <Check />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </fieldset>

          <div className="bb-buy">
            <div className="bb-qty" role="group" aria-label="Quantity">
              {/* aria-disabled, not disabled: a disabled button drops keyboard focus to the top of the page */}
              <button
                type="button"
                aria-label="Decrease quantity"
                aria-disabled={qty <= MIN_QTY}
                onClick={() => changeQty(-1)}
              >
                <Minus />
              </button>
              <span className="bb-qty__value">
                <span className="bb-visually-hidden">Quantity </span>
                {qty}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                aria-disabled={qty >= MAX_QTY}
                onClick={() => changeQty(1)}
              >
                <Plus />
              </button>
            </div>
            <button type="button" className="bb-cart">
              {copy.addToCart}
              <span className="bb-cart__dot" aria-hidden="true">
                ·
              </span>
              <span>{money(totalCents)}</span>
            </button>
          </div>
          <p className="bb-visually-hidden" aria-live="polite">
            {status}
          </p>

          <ul className="bb-trust">
            {copy.trust.map((t) => (
              <li key={t}>
                <CheckCircle />
                {t}
              </li>
            ))}
          </ul>

          {plan === "subscribe" && <p className="bb-fine">{finePrint}</p>}
        </div>
      </div>
      {reviewsOpen && (
        <Reviews
          onClose={() => {
            // Back to the link that opened them, at the top of the page.
            reviewsFocus.current = "close";
            setReviewsOpen(false);
          }}
        />
      )}
    </main>
  );
}

/** Product, price and rating data for search results (schema.org). */
function ProductJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${copy.title}, 60 softgels`,
    description: copy.subtitle,
    image: "/product.jpg",
    brand: { "@type": "Brand", name: "Natura Wellness" },
    category: copy.eyebrow,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: copy.rating,
      reviewCount: copy.reviewCount.replace(/[^0-9]/g, ""), // "2,316 reviews" -> "2316"
    },
    offers: {
      "@type": "Offer",
      price: (copy.oneTime.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

/* ---------- Icons ---------- */

function Stars() {
  // The reference shows five full stars next to 4.8; matched as drawn.
  return (
    <span className="bb-stars" role="img" aria-label={`Rated ${copy.rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />
        </svg>
      ))}
    </span>
  );
}

const Chevron = () => (
  <svg className="bb-select__chevron" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Check = () => (
  <svg className="bb-perks__icon" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckCircle = () => (
  <svg className="bb-trust__icon" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path d="M5.2 8.2l1.9 1.8 3.7-3.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Minus = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8h13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const Plus = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8h13M8 1.5v13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
