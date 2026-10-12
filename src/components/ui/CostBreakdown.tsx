import type { ReactNode } from "react";
import { cn } from "./cn";
import { COST_FILL, CostStrip, type CostKey } from "./CostStrip";
import { Estimate } from "./Markers";

/*
 * Cost breakdown of one car for the selected period: the large cost strip and
 * a table with one row per category. The table is the accessible source of the
 * numbers; the strip is decorative next to it.
 */
export interface CostBreakdownItem {
  key: CostKey;
  /** "Utrata wartości" */
  label: string;
  /** Formatted amount for the period: "523 zł". */
  amount: string;
  /** Share in the total, 0..1; drives the strip. */
  share: number;
  /** Formatted share: "40%". */
  shareText: string;
}

export function CostBreakdown({
  items,
  total,
  labels,
  animate = false,
  footer,
  className,
}: {
  /** Six items in COST_ORDER. */
  items: CostBreakdownItem[];
  /** Formatted total for the period: "1 308 zł". */
  total: string;
  labels: {
    /** Table caption for screen readers: "Koszty według kategorii, miesięcznie". */
    caption: string;
    category: string;
    amount: string;
    share: string;
    total: string;
    /** Spoken instead of "≈". */
    estimateSr: string;
  };
  animate?: boolean;
  /** Lines under the table: residual value, cost per kilometre. */
  footer?: ReactNode;
  className?: string;
}) {
  const shares = Object.fromEntries(items.map((item) => [item.key, item.share]));
  return (
    <div className={className}>
      <CostStrip shares={shares} size="lg" animate={animate} />
      <table className="mt-4 w-full border-collapse text-left">
        <caption className="sr-only">{labels.caption}</caption>
        <thead>
          <tr className="text-xs text-ink-muted">
            <th scope="col" className="pb-2 font-medium">
              {labels.category}
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              {labels.amount}
            </th>
            <th scope="col" className="w-16 pb-2 text-right font-medium">
              {labels.share}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key} className="border-t border-line">
              <th scope="row" className="py-3 pr-3 text-base font-normal text-ink">
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn("size-3 shrink-0 rounded-[2px]", COST_FILL[item.key])}
                  />
                  {item.label}
                </span>
              </th>
              <td className="py-3 text-right font-display text-lg font-semibold text-ink tabular-nums">
                <Estimate srLabel={labels.estimateSr}>{item.amount}</Estimate>
              </td>
              <td className="py-3 text-right text-sm text-ink-muted tabular-nums">
                {item.shareText}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink">
            <th scope="row" className="py-3 pr-3 text-base font-semibold text-ink">
              {labels.total}
            </th>
            <td className="py-3 text-right font-display text-xl font-semibold text-ink tabular-nums">
              <Estimate srLabel={labels.estimateSr}>{total}</Estimate>
            </td>
            <td className="py-3 text-right text-sm text-ink-muted tabular-nums">100%</td>
          </tr>
        </tfoot>
      </table>
      {footer && (
        <div className="mt-2 space-y-1 border-t border-line pt-4 text-sm text-ink-muted">
          {footer}
        </div>
      )}
    </div>
  );
}
