import { createFormatter } from 'next-intl';
import type { Locale } from '@/components/ui/format';

/*
 * Number, currency and date formatting for the pages. The rule is in
 * design/DESIGN.md, section 10: the same text in both languages except for the
 * separators, a non-breaking space before "zł", thousands separator always shown.
 * Formatting only: nothing here calculates.
 */
export type { Locale };

const NBSP = ' ';
const INTL_LOCALE: Record<Locale, string> = { pl: 'pl-PL', en: 'en-GB' };

const formatters = new Map<Locale, ReturnType<typeof createFormatter>>();

function formatterFor(locale: Locale) {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = createFormatter({ locale: INTL_LOCALE[locale] });
    formatters.set(locale, formatter);
  }
  return formatter;
}

/** Whole number with a thousands separator: "1 234" (pl), "1,234" (en). */
export function formatInteger(value: number, locale: Locale): string {
  return formatterFor(locale).number(Math.round(value), {
    maximumFractionDigits: 0,
    useGrouping: 'always',
  });
}

/** Amount in zloty rounded to whole zloty: "1 234 zł", "1,234 zł". */
export function formatPln(value: number, locale: Locale): string {
  return `${formatInteger(value, locale)}${NBSP}zł`;
}

/** Small amount with grosze: "1,05 zł", "1.05 zł". */
export function formatPlnExact(value: number, locale: Locale): string {
  const text = formatterFor(locale).number(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${text}${NBSP}zł`;
}

/** One decimal place, for consumption: "5,3", "5.3". */
export function formatDecimal(value: number, locale: Locale): string {
  return formatterFor(locale).number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Share as a whole percentage: "40%". Takes a fraction from 0 to 1. */
export function formatPercent(share: number, locale: Locale): string {
  return `${formatInteger(share * 100, locale)}%`;
}

/** Long date from an ISO date or timestamp, read in UTC: "14 września 2026", "14 September 2026". */
export function formatDate(iso: string, locale: Locale): string {
  return formatterFor(locale).dateTime(new Date(`${iso.slice(0, 10)}T00:00:00Z`), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
