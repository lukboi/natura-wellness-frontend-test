import { useState } from "react";
import { copy } from "./copy";
import { ratingBreakdown, reviews, type Review } from "./reviewData";

// Bonus: the reviews section the "2,316 reviews" link points to. Not in the reference design, so it
// follows the buy box's look: cream page, white cards, forest headings, gold stars.

const PAGE = 4;
const total = Object.values(ratingBreakdown).reduce((a, b) => a + b, 0);
const number = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

type Stars = 1 | 2 | 3 | 4 | 5;

export function Reviews() {
  const [filter, setFilter] = useState<Stars | null>(null);
  const [shown, setShown] = useState(PAGE);

  const matching = filter ? reviews.filter((r) => r.rating === filter) : reviews;
  const visible = matching.slice(0, shown);

  function toggleFilter(stars: Stars) {
    setFilter((f) => (f === stars ? null : stars));
    setShown(PAGE);
  }

  return (
    <section className="rv" id="reviews" aria-labelledby="reviews-title">
      <div className="rv-summary">
        <h2 className="rv-title" id="reviews-title">
          Customer reviews
        </h2>
        <div className="rv-score">
          <span className="rv-score__value" aria-hidden="true">
            {copy.rating}
          </span>
          <div>
            <StarRow rating={5} label={`Rated ${copy.rating} out of 5`} />
            <p className="rv-score__count">Based on {copy.reviewCount}</p>
          </div>
        </div>

        <ul className="rv-bars" aria-label="Filter reviews by rating">
          {([5, 4, 3, 2, 1] as Stars[]).map((stars) => {
            const count = ratingBreakdown[stars];
            const pct = Math.round((count / total) * 100);
            return (
              <li key={stars}>
                <button
                  type="button"
                  className="rv-bar"
                  aria-pressed={filter === stars}
                  onClick={() => toggleFilter(stars)}
                >
                  <span className="rv-bar__label">
                    {stars} star{stars > 1 ? "s" : ""}
                  </span>
                  <span className="rv-bar__track" aria-hidden="true">
                    <span className="rv-bar__fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="rv-bar__count">
                    {number.format(count)}
                    <span className="rv-visually-hidden"> reviews, {pct}%</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rv-list">
        <p className="rv-status" aria-live="polite">
          {filter ? (
            <>
              Showing {stars(filter)} reviews.{" "}
              <button type="button" className="rv-clear" onClick={() => toggleFilter(filter)}>
                Show all
              </button>
            </>
          ) : (
            "Most recent first"
          )}
        </p>

        {visible.length === 0 ? (
          <p className="rv-empty">No {stars(filter!)} reviews in this sample yet.</p>
        ) : (
          <ul className="rv-cards">
            {visible.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} />
              </li>
            ))}
          </ul>
        )}

        {shown < matching.length && (
          <button type="button" className="rv-more" onClick={() => setShown((n) => n + PAGE)}>
            Show more reviews
          </button>
        )}
      </div>
    </section>
  );
}

const stars = (n: number) => `${n}-star`;

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rv-card" aria-labelledby={`${review.id}-title`}>
      <StarRow rating={review.rating} label={`Rated ${review.rating} out of 5`} />
      <h3 className="rv-card__title" id={`${review.id}-title`}>
        {review.title}
      </h3>
      <p className="rv-card__body">{review.body}</p>
      <p className="rv-card__meta">
        <span className="rv-card__author">{review.author}</span>
        <span aria-hidden="true"> · </span>
        <time dateTime={review.date}>{dateFormat.format(new Date(`${review.date}T12:00:00`))}</time>
        {review.subscriber ? (
          <span className="rv-tag rv-tag--sub">Subscriber</span>
        ) : (
          <span className="rv-tag">Verified buyer</span>
        )}
      </p>
    </article>
  );
}

function StarRow({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="rv-stars" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" aria-hidden="true" className={i < rating ? "is-on" : undefined}>
          <path d="M10 1.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />
        </svg>
      ))}
    </span>
  );
}
