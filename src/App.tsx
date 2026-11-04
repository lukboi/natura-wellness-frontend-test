import { useEffect, useRef, useState } from "react";
import { SubscriptionCard } from "./part-a/SubscriptionCard";
import { BuyBox } from "./part-b/BuyBox";
import "./review-toolbar.css";

// Review toolbar (not part of either deliverable): preview the page at a fixed width, and for Part B,
// lay the reference screenshot over the page. Everything is kept in the URL so a link can be shared.
//
//   ?part=a|b  &fixture=…  &width=375|768|1200  &overlay=1  &opacity=0..100
//
// Fixed widths load the page in an iframe of that width. The page's CSS responds to the window width,
// so squeezing a wrapper wouldn't trigger the phone or tablet layout. Inside the iframe, &embed=1 hides
// this toolbar.

const params = new URLSearchParams(window.location.search);
const part = params.get("part") === "b" ? "b" : "a";
const embedded = params.get("embed") === "1";

const WIDTHS = [
  { id: "375", label: "Phone", px: 375 },
  { id: "768", label: "Tablet", px: 768 },
  { id: "1200", label: "Desktop", px: 1200 },
  { id: "full", label: "Full", px: null },
] as const;
type WidthId = (typeof WIDTHS)[number]["id"];

const FIXTURES = ["active", "paused", "cancelled", "error"];

/** The overlay is drawn by the page itself (it has to line up with it); the toolbar only sets these. */
function applyOverlay(doc: Document | null | undefined, on: boolean, opacity: number, diff: boolean) {
  if (!doc) return;
  doc.documentElement.style.setProperty("--ref-display", on ? "block" : "none");
  doc.documentElement.style.setProperty("--ref-opacity", String(opacity / 100));
  doc.documentElement.style.setProperty("--ref-blend", diff ? "difference" : "normal");
}

const initialOverlay = params.get("overlay") === "1";
const initialOpacity = Number(params.get("opacity") ?? 50);
const initialDiff = params.get("diff") === "1";
applyOverlay(document, initialOverlay, initialOpacity, initialDiff);

export function App() {
  if (embedded) return part === "a" ? <SubscriptionCard /> : <BuyBox />;
  return <ReviewShell />;
}

function ReviewShell() {
  const [width, setWidth] = useState<WidthId>((WIDTHS.find((w) => w.id === params.get("width"))?.id ?? "full") as WidthId);
  const [overlay, setOverlay] = useState(initialOverlay);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [diff, setDiff] = useState(initialDiff);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const px = WIDTHS.find((w) => w.id === width)?.px ?? null;

  // Keep the URL in step so the current view can be shared.
  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    next.set("width", width);
    if (part === "b") {
      next.set("overlay", overlay ? "1" : "0");
      next.set("opacity", String(opacity));
      next.set("diff", diff ? "1" : "0");
    }
    history.replaceState(null, "", `?${next}`);
    applyOverlay(document, overlay, opacity, diff);
    applyOverlay(frameRef.current?.contentDocument, overlay, opacity, diff);
  }, [width, overlay, opacity, diff]);

  // The iframe shows the same page without the toolbar. Its src only changes with the page, not the overlay.
  const frameSrc = (() => {
    const p = new URLSearchParams(window.location.search);
    ["width", "overlay", "opacity", "diff"].forEach((k) => p.delete(k));
    p.set("embed", "1");
    return `?${p}`;
  })();

  const fixture = params.get("fixture") ?? "active";

  return (
    <>
      <nav className="rt-bar" aria-label="Review tools">
        <div className="rt-group">
          <a href="?part=a&fixture=active" aria-current={part === "a" ? "page" : undefined}>
            Part A: Subscription page
          </a>
          <a href="?part=b" aria-current={part === "b" ? "page" : undefined}>
            Part B: Buy box
          </a>
        </div>

        {part === "a" && (
          <div className="rt-group" role="group" aria-label="Test case">
            {FIXTURES.map((f) => (
              <a key={f} href={`?part=a&fixture=${f}&width=${width}`} aria-current={fixture === f ? "true" : undefined}>
                {f}
              </a>
            ))}
          </div>
        )}

        <div className="rt-group" role="group" aria-label="Preview width">
          {WIDTHS.map((w) => (
            <button key={w.id} type="button" aria-pressed={width === w.id} onClick={() => setWidth(w.id)}>
              {w.label}
              {w.px ? <span className="rt-px"> {w.px}</span> : null}
            </button>
          ))}
        </div>

        {part === "b" && (
          <div className="rt-group">
            <label className="rt-check">
              <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} />
              Reference overlay
            </label>
            <label className="rt-range">
              <span className="rt-visually-hidden">Overlay opacity</span>
              <input
                type="range"
                min={0}
                max={100}
                value={opacity}
                disabled={!overlay}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
              <span className="rt-px">{opacity}%</span>
            </label>
            <label className="rt-check" title="Matching pixels turn black; anything out of place lights up">
              <input type="checkbox" checked={diff} disabled={!overlay} onChange={(e) => setDiff(e.target.checked)} />
              Difference
            </label>
          </div>
        )}
      </nav>

      {px ? (
        <div className="rt-stage">
          <iframe
            ref={frameRef}
            key={frameSrc}
            className="rt-frame"
            title={`Preview at ${px}px`}
            src={frameSrc}
            style={{ width: px }}
            onLoad={() => applyOverlay(frameRef.current?.contentDocument, overlay, opacity, diff)}
          />
        </div>
      ) : part === "a" ? (
        <SubscriptionCard />
      ) : (
        <BuyBox />
      )}
    </>
  );
}
