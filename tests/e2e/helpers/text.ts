import { createTranslator } from "next-intl";
import en from "../../../messages/en.json";
import pl from "../../../messages/pl.json";

/*
 * Texts and number formats as a visitor reads them. Texts come from the message
 * files of the site; numbers follow the formatting rule of the design (thousands
 * separator always shown, whole złoty, a non-breaking space before "zł").
 */

export type Locale = "pl" | "en";
export const LOCALES: readonly Locale[] = ["pl", "en"];

const translators = {
  pl: createTranslator({ locale: "pl", messages: pl }),
  en: createTranslator({ locale: "en", messages: en }),
};

type Values = Record<string, string | number | ((chunks: string) => string)>;

/**
 * A message as plain text. Tags of rich messages are dropped and their content kept,
 * unless `values` gives a function for the tag.
 */
export function msg(locale: Locale, key: string, values: Values = {}): string {
  const translate = translators[locale] as unknown as {
    markup: (key: string, values: Record<string, unknown>) => string;
  };
  const keep = (chunks: string) => chunks;
  return translate.markup(key, {
    value: keep,
    checked: keep,
    fuel: keep,
    catalogue: keep,
    ...values,
  });
}

/** Raw message values that are not strings (lists of paragraphs, source rows). */
export function messages(locale: Locale): typeof pl {
  return locale === "pl" ? pl : (en as unknown as typeof pl);
}

const INTL: Record<Locale, string> = { pl: "pl-PL", en: "en-GB" };
const NBSP = " ";

export function integer(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL[locale], {
    maximumFractionDigits: 0,
    useGrouping: "always",
  }).format(Math.round(value));
}

export function pln(value: number, locale: Locale): string {
  return `${integer(value, locale)}${NBSP}zł`;
}

export function plnExact(value: number, locale: Locale): string {
  const text = new Intl.NumberFormat(INTL[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${text}${NBSP}zł`;
}

export function decimal(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL[locale], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function percent(share: number, locale: Locale): string {
  return `${integer(share * 100, locale)}%`;
}

export function longDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

/** Collapses every kind of space (also non-breaking ones) to one plain space. */
export function squash(text: string | null | undefined): string {
  return (text ?? "").replace(/[\s  ]+/g, " ").trim();
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches the text exactly, whatever kind of space separates its words. */
export function exactly(text: string): RegExp {
  return new RegExp(`^${escapeRegExp(squash(text)).replace(/ /g, "[\\s\\u00A0\\u202F]+")}$`);
}
