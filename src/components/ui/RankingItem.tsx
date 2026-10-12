import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { CarName, nameWrapClass } from "./CarName";
import { cn } from "./cn";
import { CostStrip, ValueBar, type CostKey } from "./CostStrip";
import { Estimate } from "./Markers";

/*
 * One row of a ranking. The whole row is the link to the car (stretched link);
 * the comparison toggle sits above it. All texts arrive formatted.
 *
 * Layout follows the width of the list, not of the viewport (container query):
 *   list narrower than 48rem  stacked: name on the full width, attributes and value,
 *                             bar, then price and toggle
 *   list 48rem or wider       one line: rank, name (attributes and bar under it), value, toggle
 */
export interface RankingItemProps {
  rank: number;
  href: string;
  /** make + " " + variant. Printed in full; wraps, never truncated. */
  name: string;
  /** Attributes in one phrase, normally <CarMeta>: body type, fuel, gearbox, power. */
  meta: ReactNode;
  /** Secondary line, usually "cena orientacyjna 65 400 zł". */
  detail?: ReactNode;
  /** The ranked value, formatted: "1 308 zł", "65 400 zł", "5,3 l/100 km". */
  value: string;
  /** Text under the value: "miesięcznie", "cena orientacyjna", "WLTP". */
  valueCaption: string;
  /** Model output: prefixes the value with "≈". */
  estimate?: boolean;
  /** Spoken instead of "≈". Required when estimate is set. */
  estimateSrLabel?: string;
  /** Bar of the row. Omit on lists ranked by price on the home page. */
  bar?:
    | {
        kind: "strip";
        ratio: number;
        shares: Partial<Record<CostKey, number>>;
        emphasis?: CostKey;
      }
    | { kind: "value"; ratio: number };
  /** Slot for <CompareToggle>. */
  action?: ReactNode;
  /** Preview only. */
  demo?: "hover" | "focus";
}

export function RankingItem({
  rank,
  href,
  name,
  meta,
  detail,
  value,
  valueCaption,
  estimate = false,
  estimateSrLabel = "",
  bar,
  action,
  demo,
}: RankingItemProps) {
  const hasBar = Boolean(bar);
  const hasAction = Boolean(action);
  const span = hasBar ? "@3xl:row-span-3" : "@3xl:row-span-2";
  return (
    <li
      data-demo={demo}
      className={cn(
        "group relative grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-3 bg-surface px-4 py-4 transition-colors duration-(--duration-fast)",
        "hover:bg-brand-soft",
        "has-[.row-link:focus-visible]:z-10 has-[.row-link:focus-visible]:outline-3 has-[.row-link:focus-visible]:-outline-offset-3 has-[.row-link:focus-visible]:outline-(--focus-ring)",
        "data-[demo~=focus]:-outline-offset-3",
        "@3xl:gap-x-6 @3xl:px-5",
        hasAction
          ? "@3xl:grid-cols-[2.25rem_minmax(0,1fr)_8.5rem_9.5rem]"
          : "@3xl:grid-cols-[2.25rem_minmax(0,1fr)_8.5rem]",
      )}
    >
      <span
        aria-hidden="true"
        className="font-display text-xl leading-6 font-semibold text-ink-muted tabular-nums"
      >
        {rank}
      </span>

      {/* The name has the full width of the row in the narrow layout: real names are long. */}
      <h3 className="col-span-2 min-w-0 font-display text-lg leading-6 font-semibold text-ink @3xl:col-span-1">
        <Link
          href={href}
          className={cn(
            "row-link outline-none group-hover:underline group-hover:decoration-1 group-hover:underline-offset-[3px] after:absolute after:inset-0 after:content-['']",
            nameWrapClass,
          )}
        >
          <span className="sr-only">{rank}. </span>
          <CarName>{name}</CarName>
        </Link>
      </h3>

      <div className="col-start-2 mt-0.5 min-w-0 @3xl:row-start-2">
        <p className="text-sm text-ink-muted">{meta}</p>
        {detail && <p className="mt-0.5 hidden text-xs text-ink-muted @3xl:block">{detail}</p>}
      </div>

      <div
        className={cn(
          "col-start-3 row-start-2 mt-0.5 text-right @3xl:row-start-1 @3xl:mt-0 @3xl:self-center",
          span,
        )}
      >
        <p className="font-display text-xl leading-6 font-semibold text-ink tabular-nums">
          {estimate ? <Estimate srLabel={estimateSrLabel}>{value}</Estimate> : value}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">{valueCaption}</p>
      </div>

      {bar && (
        <div className="col-span-2 col-start-2 mt-2.5 @3xl:col-span-1 @3xl:col-start-2 @3xl:row-start-3">
          {bar.kind === "strip" ? (
            <CostStrip shares={bar.shares} ratio={bar.ratio} emphasis={bar.emphasis} />
          ) : (
            <ValueBar ratio={bar.ratio} />
          )}
        </div>
      )}

      {(detail || action) && (
        <div
          className={cn(
            "col-span-2 col-start-2 mt-2.5 flex items-center justify-between gap-x-3 @3xl:col-span-1 @3xl:col-start-4 @3xl:row-start-1 @3xl:mt-0 @3xl:justify-end @3xl:self-center",
            span,
            !hasAction && "@3xl:hidden",
          )}
        >
          {detail && <p className="min-w-0 text-xs text-ink-muted @3xl:hidden">{detail}</p>}
          {action}
        </div>
      )}
    </li>
  );
}

/** Ordered list wrapper: one bordered panel, rows divided by hairlines. */
export function RankingList({
  children,
  label,
  className,
}: {
  children: ReactNode;
  /** Accessible name of the list, e.g. the ranking title. */
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("@container", className)}>
      <ol
        role="list"
        aria-label={label}
        className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface"
      >
        {children}
      </ol>
    </div>
  );
}
