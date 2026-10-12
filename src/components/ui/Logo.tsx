import { cn } from "./cn";

/*
 * WheelWise mark: a wheel rim drawn as a cost ring. Five sixths of the rim are
 * one colour, one sixth is amber: the part of the cost you had not counted.
 * The wordmark is set in Barlow Semi Condensed 600.
 */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
    >
      <circle
        cx="16"
        cy="16"
        r="11"
        stroke="currentColor"
        strokeWidth="5"
        strokeDasharray="54.6 14.52"
        strokeDashoffset="-13.02"
        transform="rotate(-90 16 16)"
      />
      <circle
        cx="16"
        cy="16"
        r="11"
        className="stroke-signal"
        strokeWidth="5"
        strokeDasharray="8.52 60.6"
        strokeDashoffset="-1.5"
        transform="rotate(-90 16 16)"
      />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  tone = "on-brand",
  className,
}: {
  /** "on-brand" for the petrol header, "brand" for light surfaces. */
  tone?: "on-brand" | "brand";
  className?: string;
}) {
  return (
    <span
      translate="no"
      className={cn(
        "inline-flex items-center gap-2 font-display text-xl font-semibold tracking-[-0.01em]",
        tone === "on-brand" ? "text-on-brand" : "text-brand-strong",
        className,
      )}
    >
      <LogoMark />
      WheelWise
    </span>
  );
}
