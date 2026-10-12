import type { CSSProperties } from "react";
import { cn } from "./cn";

/*
 * The cost strip: WheelWise's signature element. One horizontal bar split into
 * the six cost categories, always in the same order and the same colours.
 * It never stands alone: amounts are always printed next to it as text.
 */

export type CostKey =
  | "depreciation"
  | "fuel"
  | "insurance"
  | "service"
  | "parts"
  | "fees";

/** Fixed order of categories everywhere on the site. */
export const COST_ORDER: CostKey[] = [
  "depreciation",
  "fuel",
  "insurance",
  "service",
  "parts",
  "fees",
];

export const COST_FILL: Record<CostKey, string> = {
  depreciation: "bg-cost-depreciation",
  fuel: "bg-cost-fuel",
  insurance: "bg-cost-insurance",
  service: "bg-cost-service",
  parts: "bg-cost-parts",
  fees: "bg-cost-fees",
};

export function CostStrip({
  shares,
  size = "sm",
  ratio = 1,
  emphasis,
  animate = false,
  label,
  className,
}: {
  /** Share of each category in the total, 0..1. Missing keys are skipped. */
  shares: Partial<Record<CostKey, number>>;
  /** sm = 8 px (lists, table), lg = 24 px (car page). */
  size?: "sm" | "lg";
  /** Length of the strip relative to its track, 0..1 (value / largest value in the list). */
  ratio?: number;
  /** Shows one category in colour and the rest in grey (single-metric rankings). */
  emphasis?: CostKey;
  /** Plays the grow-in once on mount. Car page only. */
  animate?: boolean;
  /** Text alternative. Omit when the same numbers are printed beside the strip. */
  label?: string;
  className?: string;
}) {
  const keys = COST_ORDER.filter((key) => (shares[key] ?? 0) > 0);
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "w-full overflow-hidden bg-sunken",
        size === "lg" ? "h-6 rounded-sm" : "h-2 rounded-[2px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full origin-left gap-0.5 bg-surface",
          animate && "animate-strip-grow",
        )}
        style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
      >
        {keys.map((key) => (
          <span
            key={key}
            className={cn(
              "h-full min-w-0.5 basis-0",
              emphasis && emphasis !== key ? "bg-line-strong" : COST_FILL[key],
            )}
            style={{ flexGrow: shares[key] } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

/** Single-colour bar for rankings by one number (price, consumption). */
export function ValueBar({
  ratio,
  className,
}: {
  /** value / largest value in the list, 0..1. */
  ratio: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-2 w-full overflow-hidden rounded-[2px] bg-sunken", className)}
    >
      <div
        className="h-full bg-brand"
        style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
      />
    </div>
  );
}
