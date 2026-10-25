import { cn } from "./cn";
import { LOGO_BARS, LOGO_RING, LOGO_VIEWBOX_WIDTH, LOGO_WORDMARK } from "./logo-paths";

/*
 * The WheelWise logo, drawn from the user's master file
 * (design/brand/wheelwise-logo.png): a ring with three bars inside, and the
 * wordmark "WheelWise". The ring and the wordmark take the text colour of the
 * surface (currentColor); the bars take palette tokens: the two tall bars a
 * quiet petrol tone, the shortest bar amber (on light surfaces the dark amber
 * `caution`, because `signal` has too little contrast there). Inline SVG with fixed width and height: no request, no layout
 * shift, sharp at every pixel density.
 */

type Tone = "on-brand" | "brand";

/**
 * Bar fills per surface, left to right. Literal class names so Tailwind finds
 * them. Contrast of every bar against its background: design/DESIGN.md,
 * section 4.2.
 */
const BAR_FILLS: Record<Tone, readonly [string, string, string]> = {
  "on-brand": ["fill-on-brand-muted", "fill-on-brand-muted", "fill-signal"],
  brand: ["fill-brand", "fill-brand", "fill-caution"],
};

/** Rendered height of the full logo in px; the width follows the outline. */
const LOGO_HEIGHT = 32;
const LOGO_WIDTH = Math.round(((LOGO_HEIGHT * LOGO_VIEWBOX_WIDTH) / 48) * 100) / 100;

function MarkShapes({ tone }: { tone: Tone }) {
  return (
    <>
      {LOGO_BARS.map((d, i) => (
        <path key={d} d={d} className={BAR_FILLS[tone][i]} />
      ))}
      {/* Drawn after the bars: it covers their lower ends, as in the master. */}
      <circle
        cx={LOGO_RING.cx}
        cy={LOGO_RING.cy}
        r={LOGO_RING.r}
        fill="none"
        stroke="currentColor"
        strokeWidth={LOGO_RING.strokeWidth}
      />
    </>
  );
}

/**
 * The mark alone (ring and bars), square. Decorative: always aria-hidden.
 * The ring takes the surrounding text colour; `tone` picks the bar colours
 * ("on-brand" for petrol surfaces, "brand" for light ones).
 */
export function LogoMark({
  size = 28,
  tone = "on-brand",
  className,
}: {
  size?: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn("shrink-0", className)}
    >
      <MarkShapes tone={tone} />
    </svg>
  );
}

export function Logo({
  tone = "on-brand",
  className,
}: {
  /** "on-brand" for the petrol header and footer, "brand" for light surfaces. */
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      translate="no"
      className={cn(
        "inline-flex shrink-0 items-center",
        tone === "on-brand" ? "text-on-brand" : "text-brand-strong",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        viewBox={`0 0 ${LOGO_VIEWBOX_WIDTH} 48`}
        className="block shrink-0"
      >
        <MarkShapes tone={tone} />
        <path d={LOGO_WORDMARK} fill="currentColor" />
      </svg>
      <span className="sr-only">WheelWise</span>
    </span>
  );
}
