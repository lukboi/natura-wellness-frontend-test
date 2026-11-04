import { useCallback, useEffect, useRef, useState } from "react";
import { getSubscription, skipNextShipment } from "../api/mockApi";
import { totalAfterDiscount } from "../api/fixtures";
import { ApiError, type Subscription, type SubscriptionItem } from "../api/types";
import { CancelFlow } from "./CancelFlow";
import { formatDate, formatMoney, formatShortDate, relativeDays } from "./format";
import { DAY_MS, restart, simulateSkip } from "./localActions";
import "./subscription.css";

const SUPPORT_EMAIL = "help@naturawellness.example";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; notFound: boolean }
  | { kind: "ready"; sub: Subscription };

/** Banner shown on the page after something happened, so the customer always knows the outcome. */
type Notice = { tone: "success" | "info"; text: string } | null;

const toError = (e: unknown): LoadState => ({ kind: "error", notFound: e instanceof ApiError && e.status === 404 });

const apiSkip = (sub: Subscription) =>
  skipNextShipment({ subscriptionId: sub.id, expectedUpdatedAt: sub.updatedAt });

export function SubscriptionCard() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [notice, setNotice] = useState<Notice>(null);
  // The API keeps no skip history, so we can only count skips made during this visit.
  const [skipsThisVisit, setSkipsThisVisit] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  // Local-only copy once the customer uses anything the API doesn't support. See README.
  const [local, setLocal] = useState<Subscription | null>(null);

  const retryLoad = useCallback(() => {
    setState({ kind: "loading" });
    getSubscription().then(
      (sub) => setState({ kind: "ready", sub }),
      (e) => setState(toError(e)),
    );
  }, []);

  useEffect(() => {
    let live = true;
    getSubscription().then(
      (sub) => live && setState({ kind: "ready", sub }),
      (e) => live && setState(toError(e)),
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="sub-shell">
      <main className="sub-page">
        <h1 className="sub-title">Your subscription</h1>

        <div aria-live="polite">
          {notice && (
            <div className={`sub-notice sub-notice--${notice.tone}`}>
              <p>{notice.text}</p>
              <button type="button" className="sub-notice__close" aria-label="Dismiss message" onClick={() => setNotice(null)}>
                ×
              </button>
            </div>
          )}
        </div>

        {state.kind === "loading" && <Skeleton />}
        {state.kind === "error" && <LoadError notFound={state.notFound} onRetry={retryLoad} />}
        {state.kind === "ready" && (
          <>
            <SubscriptionView
              sub={local ?? state.sub}
              onSkip={() => {
                setNotice(null);
                setConfirmOpen(true);
              }}
              onRestart={() => {
                setNotice(null);
                setRestartOpen(true);
              }}
              onCancel={() => {
                setNotice(null);
                setCancelOpen(true);
              }}
            />
            {cancelOpen && (
              <CancelFlow
                sub={local ?? state.sub}
                onClose={() => setCancelOpen(false)}
                onApply={(updated, text) => {
                  setLocal(updated);
                  setCancelOpen(false);
                  setNotice({ tone: "success", text });
                }}
                onSkipInstead={() => {
                  setCancelOpen(false);
                  setConfirmOpen(true);
                }}
                onCancelled={(cancelled) => {
                  setLocal(cancelled);
                  setCancelOpen(false);
                  setNotice({
                    tone: "info",
                    text: "Your subscription is cancelled. You won't be charged again. If you change your mind, you can resubscribe below.",
                  });
                }}
              />
            )}
            {restartOpen && (
              <RestartDialog
                sub={local ?? state.sub}
                onClose={() => setRestartOpen(false)}
                onConfirm={(restarted, wasPaused) => {
                  setLocal(restarted);
                  setSkipsThisVisit(0);
                  setRestartOpen(false);
                  setNotice({
                    tone: "success",
                    text: `${wasPaused ? "Welcome back! Your subscription is active again" : "You're subscribed again"}. Your next shipment is charged ${formatDate(restarted.nextChargeAt!)}.`,
                  });
                }}
              />
            )}
            {confirmOpen && (
              <SkipDialog
                sub={local ?? state.sub}
                skip={local ? simulateSkip : apiSkip}
                skipsThisVisit={skipsThisVisit}
                onClose={() => setConfirmOpen(false)}
                onSubscriptionChange={(sub) => (local ? setLocal(sub) : setState({ kind: "ready", sub }))}
                onSkipped={() => setSkipsThisVisit((n) => n + 1)}
                onDone={(n) => {
                  setConfirmOpen(false);
                  setNotice(n);
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- Status views ---------- */

interface ViewProps {
  sub: Subscription;
  onSkip: () => void;
  onRestart: () => void;
  onCancel: () => void;
}

function SubscriptionView({ sub, onSkip, onRestart, onCancel }: ViewProps) {
  const cancelLink = (
    <button type="button" className="sub-link sub-link--block" onClick={onCancel}>
      Cancel subscription
    </button>
  );
  if (sub.status === "active" && sub.nextChargeAt && sub.nextChargeTotalCents != null) {
    const subtotal = sub.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
    return (
      <section className="sub-card" aria-labelledby="next-heading">
        <StatusPill status="active" intervalDays={sub.intervalDays} />
        <h2 className="sub-eyebrow" id="next-heading">
          Next shipment
        </h2>
        <p className="sub-date">
          {formatDate(sub.nextChargeAt)} <span className="sub-date__rel">· {relativeDays(sub.nextChargeAt)}</span>
        </p>
        <div className="sub-total">
          <span className="sub-total__amount">{formatMoney(sub.nextChargeTotalCents)}</span>
          {subtotal > sub.nextChargeTotalCents && (
            <span className="sub-total__save">
              <s aria-label={`was ${formatMoney(subtotal)}`}>{formatMoney(subtotal)}</s> You save {sub.discountPercent}%
            </span>
          )}
        </div>
        <p className="sub-muted">
          Charged on {formatShortDate(sub.nextChargeAt)}, then every {sub.intervalDays} days.
        </p>

        <ItemList items={sub.items} />

        <div className="sub-actions">
          <button type="button" className="sub-btn sub-btn--secondary" onClick={onSkip}>
            Skip this shipment
          </button>
          {cancelLink}
        </div>
      </section>
    );
  }

  if (sub.status === "paused") {
    return (
      <section className="sub-card sub-card--inactive" aria-label="Paused subscription">
        <StatusPill status="paused" />
        {sub.pausedUntil ? (
          <>
            <p className="sub-date">Resumes {formatDate(sub.pausedUntil)}</p>
            <p className="sub-muted">That's {relativeDays(sub.pausedUntil)}. You won't be charged until then.</p>
          </>
        ) : (
          <p className="sub-muted">You won't be charged while your subscription is paused.</p>
        )}
        <ItemList items={sub.items} heading="When it resumes, you'll get" />
        <p className="sub-muted">
          About {formatMoney(totalAfterDiscount(sub.items, sub.discountPercent))} per shipment, every {sub.intervalDays}{" "}
          days.
        </p>
        <div className="sub-actions">
          <button type="button" className="sub-btn sub-btn--primary" onClick={onRestart}>
            Resume now
          </button>
          {sub.pausedUntil && (
            <p className="sub-hint">Or do nothing, and it resumes on its own on {formatShortDate(sub.pausedUntil)}.</p>
          )}
          {cancelLink}
        </div>
      </section>
    );
  }

  if (sub.status === "cancelled") {
    return (
      <section className="sub-card sub-card--inactive" aria-label="Cancelled subscription">
        <StatusPill status="cancelled" />
        <p className="sub-date">{sub.cancelledAt ? `Cancelled on ${formatDate(sub.cancelledAt)}` : "Cancelled"}</p>
        <p className="sub-muted">No more shipments or charges are scheduled.</p>
        <ItemList items={sub.items} heading="What you were getting" />
        <div className="sub-actions">
          <button type="button" className="sub-btn sub-btn--primary" onClick={onRestart}>
            Resubscribe and save {sub.discountPercent}%
          </button>
          <p className="sub-hint">
            Same products, {formatMoney(totalAfterDiscount(sub.items, sub.discountPercent))} every {sub.intervalDays} days.
            Cancel anytime.
          </p>
        </div>
      </section>
    );
  }

  // Active but missing its next charge: data we don't expect. Don't guess, say so.
  return (
    <section className="sub-card sub-card--inactive">
      <p className="sub-date">We can't show your next shipment right now</p>
      <p className="sub-muted">
        Please contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we'll sort it out.
      </p>
    </section>
  );
}

function StatusPill({ status, intervalDays }: { status: Subscription["status"]; intervalDays?: number }) {
  const label =
    status === "active" ? `Active · every ${intervalDays} days` : status === "paused" ? "Paused" : "Cancelled";
  return <span className={`sub-pill sub-pill--${status}`}>{label}</span>;
}

function ItemList({ items, heading = "In this shipment" }: { items: SubscriptionItem[]; heading?: string }) {
  return (
    <div className="sub-items">
      <h3 className="sub-items__heading">{heading}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.sku} className="sub-item">
            {item.imageUrl ? (
              <img className="sub-item__img" src={item.imageUrl} alt="" />
            ) : (
              <span className="sub-item__img sub-item__img--empty" aria-hidden="true">
                {item.name.charAt(0)}
              </span>
            )}
            <span className="sub-item__name">{item.name}</span>
            <span className="sub-item__qty" aria-label={`quantity ${item.quantity}`}>
              ×{item.quantity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Loading and load errors ---------- */

function Skeleton() {
  return (
    <div className="sub-card" role="status" aria-label="Loading your subscription">
      <span className="sk sk--pill" />
      <span className="sk sk--line" style={{ width: "40%" }} />
      <span className="sk sk--date" />
      <span className="sk sk--total" />
      <span className="sk sk--row" />
      <span className="sk sk--row" />
      <span className="sk sk--btn" />
    </div>
  );
}

function LoadError({ notFound, onRetry }: { notFound: boolean; onRetry: () => void }) {
  return (
    <section className="sub-card" role="alert">
      {notFound ? (
        <>
          <p className="sub-date">We couldn't find a subscription</p>
          <p className="sub-muted">
            If you think you should have one, contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </>
      ) : (
        <>
          <p className="sub-date">We couldn't load your subscription</p>
          <p className="sub-muted">
            This is a problem on our side, and nothing about your subscription has changed. Try again, or contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if it keeps happening.
          </p>
          <div className="sub-actions">
            <button type="button" className="sub-btn sub-btn--primary" onClick={onRetry}>
              Try again
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- Skip confirmation ---------- */

interface SkipDialogProps {
  sub: Subscription;
  skip: (sub: Subscription) => Promise<Subscription>;
  skipsThisVisit: number;
  onClose: () => void;
  onSubscriptionChange: (sub: Subscription) => void;
  onSkipped: () => void;
  onDone: (notice: Notice) => void;
}

function SkipDialog({ sub, skip, skipsThisVisit, onClose, onSubscriptionChange, onSkipped, onDone }: SkipDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState<false | "skipping" | "checking">(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  if (sub.status !== "active" || !sub.nextChargeAt || sub.nextChargeTotalCents == null) return null;
  const current = sub.nextChargeAt;
  const after = new Date(Date.parse(current) + sub.intervalDays * DAY_MS).toISOString();

  async function confirm() {
    setError(null);
    setBusy("skipping");
    try {
      const updated = await skip(sub);
      onSubscriptionChange(updated);
      onSkipped();
      onDone({
        tone: "success",
        text: `Done. Your ${formatShortDate(current)} shipment is skipped, and your next charge is ${formatDate(updated.nextChargeAt!)}.`,
      });
      return;
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status !== 409 && status !== 400) {
        setBusy(false);
        setError("We couldn't skip your shipment. Nothing has changed. Please try again.");
        return;
      }
    }

    // 409 or 400: our copy is out of date. Load the latest before they decide again.
    setBusy("checking");
    let fresh: Subscription;
    try {
      fresh = await getSubscription();
    } catch {
      setBusy(false);
      setError(
        "Your subscription was changed somewhere else, and we couldn't load the latest version. Nothing was skipped. Please reload the page.",
      );
      return;
    }
    onSubscriptionChange(fresh);
    setBusy(false);

    if (fresh.status !== "active" || !fresh.nextChargeAt) {
      onDone({
        tone: "info",
        text: `Nothing was skipped. Your subscription is now ${fresh.status}, so there's no upcoming shipment to skip.`,
      });
      return;
    }
    const n = conflicts + 1;
    setConflicts(n);
    const moved = fresh.nextChargeAt !== current;
    setError(
      n === 1
        ? `Your subscription was just updated somewhere else, so nothing was skipped. We've loaded the latest details${moved ? `, and your next shipment is now ${formatDate(fresh.nextChargeAt)}` : ""}. Check them and try again.`
        : `We still couldn't skip it, and nothing has changed. Try again in a moment, or email ${SUPPORT_EMAIL} and we'll skip it for you.`,
    );
  }

  const label =
    busy === "skipping"
      ? "Skipping…"
      : busy === "checking"
        ? "Checking for changes…"
        : error
          ? "Try again"
          : `Yes, skip ${formatShortDate(current)}`;

  return (
    <dialog
      ref={ref}
      className="sub-dialog"
      aria-labelledby="skip-title"
      aria-describedby="skip-desc"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <div className="sub-dialog__body">
        <h2 id="skip-title" className="sub-dialog__title">
          Skip your {formatShortDate(current)} shipment?
        </h2>
        <div id="skip-desc">
          <div className="sub-change" aria-hidden="true">
            <span className="sub-change__from">{formatShortDate(current)}</span>
            <span>→</span>
            <span className="sub-change__to">{formatShortDate(after)}</span>
          </div>
          <p>
            You won't be charged {formatMoney(sub.nextChargeTotalCents)} on {formatShortDate(current)}. Your next charge
            moves to {formatDate(after)}.
          </p>
          {skipsThisVisit > 0 && (
            <p className="sub-warn">
              You've already skipped {skipsThisVisit === 1 ? "one shipment" : `${skipsThisVisit} shipments`}, so you'll
              skip {skipsThisVisit + 1} shipments in a row.
            </p>
          )}
        </div>

        <div aria-live="assertive">{error && <p className="sub-dialog__error">{error}</p>}</div>

        <div className="sub-dialog__actions">
          <button type="button" className="sub-btn sub-btn--primary" onClick={confirm} disabled={!!busy}>
            {label}
          </button>
          <button type="button" className="sub-btn sub-btn--ghost" onClick={onClose} disabled={!!busy}>
            Keep my shipment
          </button>
        </div>
      </div>
    </dialog>
  );
}

/* ---------- Resume / resubscribe confirmation (local only) ---------- */

function RestartDialog({
  sub,
  onClose,
  onConfirm,
}: {
  sub: Subscription;
  onClose: () => void;
  onConfirm: (restarted: Subscription, wasPaused: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const wasPaused = sub.status === "paused";
  const preview = restart(sub);

  async function confirm() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600)); // feels like a real request
    onConfirm(restart(sub), wasPaused);
  }

  return (
    <dialog
      ref={ref}
      className="sub-dialog"
      aria-labelledby="restart-title"
      aria-describedby="restart-desc"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <div className="sub-dialog__body">
        <h2 id="restart-title" className="sub-dialog__title">
          {wasPaused ? "Resume your subscription now?" : "Restart your subscription?"}
        </h2>
        <div id="restart-desc">
          <p>
            Your next shipment will be charged <strong>{formatDate(preview.nextChargeAt!)}</strong>, for{" "}
            <strong>{formatMoney(preview.nextChargeTotalCents!)}</strong>. After that, every {sub.intervalDays} days.
          </p>
          <p className="sub-muted">
            {sub.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
          </p>
        </div>
        <div className="sub-dialog__actions">
          <button type="button" className="sub-btn sub-btn--primary" onClick={confirm} disabled={busy}>
            {busy ? (wasPaused ? "Resuming…" : "Restarting…") : wasPaused ? "Yes, resume now" : "Yes, restart"}
          </button>
          <button type="button" className="sub-btn sub-btn--ghost" onClick={onClose} disabled={busy}>
            Not now
          </button>
        </div>
      </div>
    </dialog>
  );
}
