import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./Icon";

/*
 * Markers for the three kinds of "not exact" on the site:
 *   Estimate         "≈" before every amount that comes from the cost model
 *   IndicativeTag    the words "cena orientacyjna" next to a list price
 *   PriceDate        the date (and source) a price was read
 *   DataFreshness    when the data was last checked
 * and InfoNote, the quiet note for a rule the user should know about (what a
 * ranking leaves out, what a car entry stands for).
 */

/** An estimated amount: "≈ 1 308 zł". Screen readers hear the word, not the sign. */
export function Estimate({
  children,
  srLabel,
  className,
}: {
  /** The formatted amount. */
  children: ReactNode;
  /** Spoken instead of "≈": "około" (pl), "about" (en). */
  srLabel: string;
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span aria-hidden="true" className="mr-[0.2em] font-normal text-ink-muted">
        ≈
      </span>
      <span className="sr-only">{srLabel} </span>
      {children}
    </span>
  );
}

/** One line that explains the "≈" sign. Put it once per screen, under the first estimates. */
export function EstimateNote({
  children,
  className,
}: {
  /** Text after the sign, may contain a link to the methodology page. */
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-ink-muted", className)}>
      <span aria-hidden="true" className="mr-1 font-semibold text-ink">
        ≈
      </span>
      {children}
    </p>
  );
}

/**
 * A note about how the data on this screen should be read. Info icon and a
 * sentence or two; may contain a link. Not an error and not a status: it is
 * static text, so it has no live-region role.
 * Uses: under the fuel-consumption ranking (which cars it leaves out), on the
 * car page (the entry stands for several versions).
 */
export function InfoNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("flex max-w-prose items-start gap-2 text-sm text-ink-muted", className)}>
      <Icon name="info" size={16} className="mt-0.5 shrink-0 text-ink" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Tag that marks a list price as indicative. Always text, never an icon alone. */
export function IndicativeTag({
  children,
  className,
}: {
  /** "cena orientacyjna" / "indicative price". */
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-sm bg-sunken px-2 text-xs font-medium text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Date of a price with an optional source link, e.g. "Cennik z 14 września 2026". */
export function PriceDate({
  label,
  isoDate,
  dateText,
  children,
  className,
}: {
  /** Text before the date: "Cennik z" / "Price list of". */
  label: string;
  isoDate: string;
  /** The date formatted for the locale (formatDate). */
  dateText: string;
  /** Optional trailing content, usually the source link. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-ink-muted", className)}>
      {label} <time dateTime={isoDate}>{dateText}</time>
      {children}
    </p>
  );
}

/** Data freshness line: when the data was last checked and how old each source is. */
export function DataFreshness({
  children,
  tone = "light",
  className,
}: {
  /** Sentence(s) with <time> elements. */
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-xs",
        tone === "dark" ? "text-on-brand-muted" : "text-ink-muted",
        className,
      )}
    >
      <Icon name="refresh" size={16} className="mt-px" />
      <span>{children}</span>
    </p>
  );
}
