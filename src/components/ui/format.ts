/*
 * Number, currency and date formatting. Rule: design/DESIGN.md, section 10.
 * Presentation only: these functions never calculate, they only print.
 */
export type Locale = "pl" | "en";

const NBSP = "\u00A0";
const INTL_LOCALE: Record<Locale, string> = { pl: "pl-PL", en: "en-GB" };

/** Whole number with a thousands separator: "1 234" (pl), "1,234" (en). */
export function formatInteger(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    maximumFractionDigits: 0,
    useGrouping: "always",
  }).format(Math.round(value));
}

/** Amount in zloty, no grosze: "1 234 zł" (pl), "1,234 zł" (en). */
export function formatPln(value: number, locale: Locale): string {
  return `${formatInteger(value, locale)}${NBSP}zł`;
}

/** Small amount with grosze: "1,05 zł" (pl), "1.05 zł" (en). Used for the cost per kilometre. */
export function formatPlnExact(value: number, locale: Locale): string {
  const text = new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${text}${NBSP}zł`;
}

/** One decimal place: "5,3" (pl), "5.3" (en). Used for consumption. */
export function formatDecimal(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/** Share as a whole percentage: "40%". */
export function formatPercent(share: number, locale: Locale): string {
  return `${formatInteger(share * 100, locale)}%`;
}

/** Long date: "14 września 2026" (pl), "14 September 2026" (en). */
export function formatDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}
