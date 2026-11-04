import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Subscription } from "../api/types";
import { formatDate, formatMoney, formatShortDate } from "./format";
import {
  cancel,
  changeFrequency,
  DAY_MS,
  fakeLatency,
  monthlyCents,
  nextDateForFrequency,
  pause,
  pauseEnd,
  perShipmentCents,
} from "./localActions";

type Reason = "too-much" | "cost" | "different" | "results" | "other";

// Ordered by how often customers give them (38%, 24%, 15%, 12%, 11%).
const REASONS: { id: Reason; label: string }[] = [
  { id: "too-much", label: "I have too much product left" },
  { id: "cost", label: "It costs too much" },
  { id: "different", label: "I'm trying a different product" },
  { id: "results", label: "I didn't see results" },
  { id: "other", label: "Something else" },
];

const FREQUENCIES = [30, 45, 60, 90];

interface Props {
  sub: Subscription;
  onClose: () => void;
  /** The customer took an alternative instead of cancelling. */
  onApply: (updated: Subscription, message: string) => void;
  /** "Skip once" hands over to the normal skip confirmation. */
  onSkipInstead: () => void;
  onCancelled: (cancelled: Subscription) => void;
}

export function CancelFlow({ sub, onClose, onApply, onSkipInstead, onCancelled }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<"reason" | "offer" | "confirm">("reason");
  const [reason, setReason] = useState<Reason | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");

  const canSkip = sub.status === "active" && !!sub.nextChargeAt;

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  // Move focus to each new step's heading so screen readers and keyboards follow along.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const hasOffer = (r: Reason) => {
    if (r === "other") return false;
    if (r === "results") return canSkip;
    if (r === "too-much" || r === "cost") return FREQUENCIES.some((d) => d > sub.intervalDays);
    return true;
  };

  function choose(r: Reason) {
    setReason(r);
    setStep(hasOffer(r) ? "offer" : "confirm");
  }

  function back() {
    if (step === "confirm" && reason && hasOffer(reason)) setStep("offer");
    else setStep("reason");
  }

  async function apply(updated: Subscription, message: string) {
    setBusy(true);
    await fakeLatency();
    onApply(updated, message);
  }

  async function confirmCancel() {
    setBusy(true);
    await fakeLatency();
    onCancelled(cancel(sub));
  }

  return (
    <dialog
      ref={ref}
      className="sub-dialog sub-dialog--tall"
      aria-labelledby="cancel-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <div className="sub-dialog__body">
        <div className="sub-dialog__nav">
          {step !== "reason" ? (
            <button type="button" className="sub-link" onClick={back} disabled={busy}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="sub-link" onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </div>

        {step === "reason" && (
          <>
            <h2 id="cancel-title" ref={headingRef} tabIndex={-1} className="sub-dialog__title">
              Why are you cancelling?
            </h2>
            <p className="sub-muted">Pick the closest one. It helps us improve.</p>
            <ul className="sub-reasons">
              {REASONS.map((r) => (
                <li key={r.id}>
                  <button type="button" className="sub-reason" onClick={() => choose(r.id)}>
                    {r.label}
                    <span aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === "offer" && reason && (
          <Offer
            reason={reason}
            sub={sub}
            canSkip={canSkip}
            busy={busy}
            headingRef={headingRef}
            onApply={apply}
            onSkipInstead={onSkipInstead}
            onDecline={() => setStep("confirm")}
          />
        )}

        {step === "confirm" && (
          <>
            <h2 id="cancel-title" ref={headingRef} tabIndex={-1} className="sub-dialog__title">
              Cancel your subscription?
            </h2>
            <p>If you cancel:</p>
            <ul className="sub-consequences">
              {canSkip && (
                <li>
                  Your {formatShortDate(sub.nextChargeAt!)} shipment won't be sent, and you won't be charged{" "}
                  {formatMoney(perShipmentCents(sub))}.
                </li>
              )}
              {sub.status === "paused" && sub.pausedUntil && (
                <li>Your subscription won't resume on {formatShortDate(sub.pausedUntil)}.</li>
              )}
              <li>You won't be charged again.</li>
              <li>Your {sub.discountPercent}% subscriber discount ends.</li>
              <li>You can resubscribe from this page anytime.</li>
            </ul>
            {reason === "other" && (
              <label className="sub-field">
                <span>Anything you'd like to tell us? (optional)</span>
                <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} disabled={busy} />
              </label>
            )}
            <div className="sub-dialog__actions">
              <button type="button" className="sub-btn sub-btn--danger" onClick={confirmCancel} disabled={busy}>
                {busy ? "Cancelling…" : "Yes, cancel my subscription"}
              </button>
              <button type="button" className="sub-btn sub-btn--ghost" onClick={onClose} disabled={busy}>
                Keep my subscription
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

/* ---------- One offer per reason ---------- */

interface OfferProps {
  reason: Reason;
  sub: Subscription;
  canSkip: boolean;
  busy: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onApply: (updated: Subscription, message: string) => void;
  onSkipInstead: () => void;
  onDecline: () => void;
}

function Offer({ reason, sub, canSkip, busy, headingRef, onApply, onSkipInstead, onDecline }: OfferProps) {
  const skipLabel = canSkip ? `Skip the ${formatShortDate(sub.nextChargeAt!)} shipment` : null;

  let title: string;
  let body: ReactNode;
  let content: ReactNode;

  if (reason === "too-much" || reason === "cost") {
    title = reason === "too-much" ? "Get it less often instead?" : "Spread out the cost instead?";
    body =
      reason === "too-much"
        ? "Choose a slower schedule so you can use up what you have. Your next shipment moves with it."
        : `Getting it less often lowers what you pay each month. You keep your ${sub.discountPercent}% discount.`;
    content = (
      <FrequencyChoice
        sub={sub}
        busy={busy}
        onApply={onApply}
        extra={
          reason === "too-much" && skipLabel ? (
            <button type="button" className="sub-link sub-link--block" onClick={onSkipInstead} disabled={busy}>
              Or just skip the {formatShortDate(sub.nextChargeAt!)} shipment
            </button>
          ) : null
        }
      />
    );
  } else if (reason === "different") {
    title = sub.status === "paused" ? "Pause for longer instead?" : "Pause while you try it?";
    body = "Take a break with no charges. If you come back, everything's already set up. If not, you can still cancel later.";
    content = <PauseChoice sub={sub} busy={busy} onApply={onApply} />;
  } else {
    // "I didn't see results". Neutral: no claims about how long supplements take.
    title = "Want more time to decide?";
    body = `Thanks for telling us. If you're not sure yet, you can skip your next shipment. You won't be charged until ${formatDate(
      new Date(Date.parse(sub.nextChargeAt!) + sub.intervalDays * DAY_MS).toISOString(),
    )}, and you can cancel anytime before then.`;
    content = (
      <div className="sub-dialog__actions">
        <button type="button" className="sub-btn sub-btn--primary" onClick={onSkipInstead} disabled={busy}>
          {skipLabel}
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 id="cancel-title" ref={headingRef} tabIndex={-1} className="sub-dialog__title">
        {title}
      </h2>
      <p>{body}</p>
      {content}
      <div className="sub-decline">
        <button type="button" className="sub-btn sub-btn--secondary-muted" onClick={onDecline} disabled={busy}>
          No thanks, cancel my subscription
        </button>
      </div>
    </>
  );
}

function FrequencyChoice({
  sub,
  busy,
  onApply,
  extra,
}: {
  sub: Subscription;
  busy: boolean;
  onApply: (updated: Subscription, message: string) => void;
  extra: ReactNode;
}) {
  const options = FREQUENCIES.filter((d) => d > sub.intervalDays);
  const [days, setDays] = useState(options.includes(60) ? 60 : options[0]);
  const name = useId();

  if (options.length === 0) return null;

  const next = nextDateForFrequency(sub, days);
  return (
    <fieldset className="sub-options" disabled={busy}>
      <legend className="sub-visually-hidden">How often</legend>
      {options.map((d) => {
        const date = nextDateForFrequency(sub, d);
        return (
          <label key={d} className="sub-option">
            <input type="radio" name={name} checked={days === d} onChange={() => setDays(d)} />
            <span className="sub-option__text">
              <strong>Every {d} days</strong>
              <span>
                About {formatMoney(monthlyCents(sub, d))} a month
                {date ? ` · next one ${formatShortDate(date)}` : ""}
              </span>
            </span>
          </label>
        );
      })}
      <div className="sub-dialog__actions">
        <button
          type="button"
          className="sub-btn sub-btn--primary"
          onClick={() =>
            onApply(
              changeFrequency(sub, days),
              `You'll now get a shipment every ${days} days${next ? `. Your next one is ${formatDate(next)}` : ""}.`,
            )
          }
        >
          {busy ? "Saving…" : `Switch to every ${days} days`}
        </button>
        {extra}
      </div>
    </fieldset>
  );
}

function PauseChoice({
  sub,
  busy,
  onApply,
}: {
  sub: Subscription;
  busy: boolean;
  onApply: (updated: Subscription, message: string) => void;
}) {
  const [months, setMonths] = useState(2);
  const name = useId();
  const end = pauseEnd(sub, months).toISOString();

  return (
    <fieldset className="sub-options" disabled={busy}>
      <legend className="sub-visually-hidden">How long</legend>
      {[1, 2, 3].map((m) => (
        <label key={m} className="sub-option">
          <input type="radio" name={name} checked={months === m} onChange={() => setMonths(m)} />
          <span className="sub-option__text">
            <strong>
              {m} month{m > 1 ? "s" : ""}
            </strong>
            <span>Resumes {formatDate(pauseEnd(sub, m).toISOString())}</span>
          </span>
        </label>
      ))}
      <div className="sub-dialog__actions">
        <button
          type="button"
          className="sub-btn sub-btn--primary"
          onClick={() =>
            onApply(pause(sub, months), `Paused. You won't be charged until it resumes on ${formatDate(end)}.`)
          }
        >
          {busy ? "Pausing…" : `Pause until ${formatShortDate(end)}`}
        </button>
      </div>
    </fieldset>
  );
}
