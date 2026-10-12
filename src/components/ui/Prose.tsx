import type { ReactNode } from "react";
import { cn } from "./cn";

/*
 * Long-form text (methodology page). Wrap server-rendered headings, paragraphs,
 * lists and links in <Prose>; it sets measure, rhythm and link style.
 */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-prose text-base text-ink",
        "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:scroll-mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold",
        "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:scroll-mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold",
        "[&_p]:mt-3 [&_p]:leading-[1.625rem]",
        "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
        "[&_li]:leading-[1.625rem] [&_li]:marker:text-ink-muted",
        "[&_a]:text-brand [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-[3px] [&_a:hover]:text-brand-strong [&_a:hover]:decoration-2",
        "[&_strong]:font-semibold",
        "[&_code]:rounded-sm [&_code]:bg-sunken [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A notice inside long-form text: disclaimers. Bordered box, no colour stripe. */
export function Notice({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "max-w-prose rounded-lg border border-line-strong bg-surface px-5 py-4",
        className,
      )}
    >
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <div className="mt-1 text-sm leading-[1.375rem] text-ink [&_p+p]:mt-2">{children}</div>
    </aside>
  );
}

/**
 * Data table for long-form pages (data sources). On narrow screens the table
 * scrolls sideways inside its own focusable region; the page never does.
 */
export function DataTable({
  caption,
  columns,
  rows,
  className,
}: {
  /** Visible caption above the table. */
  caption: string;
  columns: string[];
  /** Cells per row; the first cell of each row is its header. */
  rows: ReactNode[][];
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cn(
        "overflow-x-auto rounded-lg border border-line bg-surface -outline-offset-3",
        className,
      )}
    >
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="border-b border-line px-4 py-3 text-left font-display text-lg font-semibold text-ink">
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="bg-ground px-4 py-2.5 text-xs font-semibold text-ink-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-line align-top">
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row" className="px-4 py-3 font-semibold text-ink">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex} className="px-4 py-3 text-ink">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
