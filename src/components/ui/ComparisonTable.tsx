import { Fragment, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { CarName, nameWrapClass } from "./CarName";
import { cn } from "./cn";
import { CostStrip, type CostKey } from "./CostStrip";
import { Icon } from "./Icon";
import { Estimate } from "./Markers";

/*
 * Comparison of 2 or 3 cars. Two renderings of the same data:
 *   from 768 px  a classic table: row labels in the first column, each car's
 *                whole name, attributes, strip and "remove" in its column header
 *   below 768 px a numbered list of the cars first (whole name, attributes,
 *                strip, remove), then the table. Its sticky column headers are
 *                only a key: the car's number and the start of its name. The
 *                row label sits on its own line above the values, so three
 *                cars fit on a 320 px screen without sideways scrolling.
 * Only one of them is displayed, so assistive technology reads one table.
 * The best value in a row carries a tick and a word ("najniżej"), not only colour.
 */
export interface ComparisonCar {
  slug: string;
  href: string;
  make: string;
  variant: string;
  /** Attributes, normally <CarMeta>: body type, fuel, gearbox, power. Two cars can share a name. */
  meta: ReactNode;
  /** Cost shares for the strip under the name. */
  shares: Partial<Record<CostKey, number>>;
}

export interface ComparisonRow {
  key: string;
  label: string;
  /** Formatted values, one per car, same order as cars. "–" when not applicable. */
  values: string[];
  /** Index of the best car in this row, or null when there is no winner (tie, no data). */
  best: number | null;
  /** Word printed under the best value: "najniżej" or "najwyżej". */
  bestLabel: string;
  /** Small text under each value, one per car or null: what kind of power a figure is. */
  notes?: (string | null)[];
  /** Model output: values get the "≈" sign. */
  estimate?: boolean;
  /** The total row: larger figures, tinted band. */
  emphasis?: boolean;
  /** Starts a new group: a heavier rule above the row. */
  groupStart?: boolean;
}

export interface ComparisonLabels {
  /** Table caption (sr-only): "Porównanie kosztów, miesięcznie". */
  caption: string;
  /** Header of the label column (sr-only): "Pozycja". */
  rowHeader: string;
  /** Accessible name of the remove button: "Usuń z porównania" (car name appended). */
  remove: string;
  /** Visible text of the remove button: "Usuń". */
  removeShort: string;
  /** Spoken instead of "≈". */
  estimateSr: string;
  /** Accessible name of the list of cars shown below 768 px: "Porównywane auta". */
  cars: string;
}

/*
 * Tinted band of the total row. Cell edges fall on fractions of a pixel, which
 * leaves hairline seams in a row background; each cell covers the seam on its left.
 */
const BAND =
  "bg-brand-soft [&_td:not(:first-child)]:shadow-[-1px_0_0_var(--color-brand-soft)]";

function Best({ label }: { label: string }) {
  return (
    <span className="my-0.5 inline-flex items-center gap-1 rounded-sm bg-positive-soft px-1.5 py-0.5 text-xs font-semibold text-positive">
      <Icon name="check" size={16} />
      {label}
    </span>
  );
}

function Value({
  row,
  index,
  labels,
  compact,
}: {
  row: ComparisonRow;
  index: number;
  labels: ComparisonLabels;
  compact?: boolean;
}) {
  const text = row.values[index];
  const note = row.notes?.[index];
  const isBest = row.best === index;
  const dash = text === "–";
  return (
    <span
      className={cn("flex", compact ? "flex-col items-start" : "flex-wrap items-center gap-x-3")}
    >
      <span
        className={cn(
          "font-display font-semibold tabular-nums",
          dash ? "text-ink-muted" : "text-ink",
          row.emphasis
            ? compact
              ? "text-lg"
              : "text-2xl"
            : compact
              ? "text-base"
              : "text-lg",
        )}
      >
        {row.estimate && !dash ? (
          <Estimate srLabel={labels.estimateSr}>{text}</Estimate>
        ) : (
          text
        )}
      </span>
      {isBest && <Best label={row.bestLabel} />}
      {note && <span className="basis-full text-xs text-ink-muted">{note}</span>}
    </span>
  );
}

/** Number that ties a column of the narrow table to its car in the list above it. */
function CarKey({ index, small }: { index: number; small?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm bg-brand-strong font-display font-semibold text-on-brand tabular-nums",
        small ? "size-5 text-sm" : "size-6 text-base",
      )}
    >
      {index + 1}
    </span>
  );
}

/** Column header from 768 px: the whole name, attributes, strip, remove. */
function CarHead({
  car,
  labels,
  onRemove,
}: {
  car: ComparisonCar;
  labels: ComparisonLabels;
  onRemove?: (slug: string) => void;
}) {
  const name = `${car.make} ${car.variant}`;
  return (
    <div className="flex h-full min-w-0 flex-col items-start">
      <Link
        href={car.href}
        className={cn(
          "max-w-full font-display text-lg leading-6 font-semibold text-ink underline-offset-[3px] hover:underline lg:text-xl lg:leading-7",
          nameWrapClass,
        )}
      >
        <CarName>{name}</CarName>
      </Link>
      <span className="mt-1 text-sm font-normal text-ink-muted">{car.meta}</span>
      <CostStrip shares={car.shares} className="mt-3" />
      <button
        type="button"
        aria-label={`${labels.remove}: ${name}`}
        onClick={onRemove ? () => onRemove(car.slug) : undefined}
        className="mt-auto inline-flex min-h-9 items-center gap-1 rounded-sm pt-2 text-xs font-semibold text-brand underline decoration-1 underline-offset-[3px] hover:text-brand-strong hover:decoration-2 pointer-coarse:min-h-11"
      >
        <Icon name="close" size={16} />
        <span>{labels.removeShort}</span>
      </button>
    </div>
  );
}

export function ComparisonTable({
  cars,
  rows,
  labels,
  onRemove,
  footer,
  className,
}: {
  /** 2 or 3 cars. */
  cars: ComparisonCar[];
  rows: ComparisonRow[];
  labels: ComparisonLabels;
  onRemove?: (slug: string) => void;
  /** Notes under the table, e.g. <InfoNote> about the power of electric cars. */
  footer?: ReactNode;
  className?: string;
}) {
  const columns = cars.length;
  return (
    <div className={cn("rounded-lg border border-line bg-surface", className)}>
      {/* From 768 px */}
      <table className="hidden w-full table-fixed border-collapse text-left md:table">
        <caption className="sr-only">{labels.caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-52 p-5 align-bottom lg:w-60">
              <span className="sr-only">{labels.rowHeader}</span>
            </th>
            {cars.map((car) => (
              <th key={car.slug} scope="col" className="h-px p-5 align-top font-normal">
                <CarHead car={car} labels={labels} onRemove={onRemove} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={cn(
                "border-t",
                row.groupStart || row.emphasis ? "border-line-strong" : "border-line",
                row.emphasis && BAND,
              )}
            >
              <th
                scope="row"
                className={cn(
                  "px-5 py-3 align-top text-base text-ink",
                  row.emphasis ? "font-semibold" : "font-normal",
                )}
              >
                {row.label}
              </th>
              {cars.map((car, index) => (
                <td key={car.slug} className="px-5 py-3 align-top">
                  <Value row={row} index={index} labels={labels} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Below 768 px: the cars, each on the full width with its whole name */}
      <ol role="list" aria-label={labels.cars} className="divide-y divide-line md:hidden">
        {cars.map((car, index) => {
          const name = `${car.make} ${car.variant}`;
          return (
            <li
              key={car.slug}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3"
            >
              <CarKey index={index} />
              <div className="min-w-0">
                <Link
                  href={car.href}
                  className={cn(
                    "inline-block min-h-6 font-display text-lg leading-6 font-semibold text-ink underline-offset-[3px] hover:underline",
                    nameWrapClass,
                  )}
                >
                  <CarName>{name}</CarName>
                </Link>
                <p className="mt-0.5 text-sm text-ink-muted">{car.meta}</p>
                <CostStrip shares={car.shares} className="mt-2" />
              </div>
              <button
                type="button"
                aria-label={`${labels.remove}: ${name}`}
                onClick={onRemove ? () => onRemove(car.slug) : undefined}
                className="-mt-1 -mr-2 inline-flex size-8 items-center justify-center rounded-sm text-ink-muted transition-colors duration-(--duration-fast) hover:bg-brand-soft hover:text-ink pointer-coarse:size-11"
              >
                <Icon name="close" />
              </button>
            </li>
          );
        })}
      </ol>

      {/* Below 768 px: the table; its sticky header is a key to the list above */}
      <table className="w-full table-fixed border-collapse text-left md:hidden">
        <caption className="sr-only">{labels.caption}</caption>
        <thead>
          <tr>
            {cars.map((car, index) => (
              <th
                key={car.slug}
                scope="col"
                className="sticky top-0 z-10 bg-surface px-3 py-2 align-top font-normal shadow-[inset_0_1px_0_var(--color-line-strong),inset_0_-1px_0_var(--color-line-strong)] first:pl-4 last:pr-4"
              >
                <span className="flex flex-col items-start gap-1">
                  <CarKey index={index} small />
                  <span
                    className={cn(
                      "line-clamp-2 text-xs font-semibold text-ink",
                      nameWrapClass,
                    )}
                  >
                    {car.make} {car.variant}
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        {rows.map((row) => (
          <Fragment key={row.key}>
            <tbody
              className={cn(
                "border-t",
                row.groupStart || row.emphasis ? "border-line-strong" : "border-line",
                row.emphasis && BAND,
              )}
            >
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={columns}
                  className={cn(
                    "px-4 pt-3 text-sm text-ink-muted",
                    row.emphasis ? "font-semibold text-ink" : "font-normal",
                  )}
                >
                  {row.label}
                </th>
              </tr>
              <tr>
                {cars.map((car, index) => (
                  <td
                    key={car.slug}
                    className="px-3 pt-0.5 pb-3 align-top first:pl-4 last:pr-4"
                  >
                    <Value row={row} index={index} labels={labels} compact />
                  </td>
                ))}
              </tr>
            </tbody>
          </Fragment>
        ))}
      </table>

      {footer && <div className="border-t border-line px-4 py-3 md:px-5">{footer}</div>}
    </div>
  );
}
