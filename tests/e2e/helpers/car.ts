import type { Locator, Page } from "@playwright/test";
import type { Assumptions, Car, Period } from "@/lib/domain/types";
import { costsOf, periodCosts, requiredIncome } from "./catalogue";
import { expect } from "./fixtures";
import { exactly, msg, percent, pln, plnExact, squash, type Locale } from "./text";
import { estimateText, readTable } from "./ui";

/*
 * What the car page must print for a car and a set of assumptions, computed with
 * the cost engine in the test process.
 */

const CATEGORIES = ["depreciation", "fuel", "insurance", "service", "parts", "fees"] as const;

function periodWord(locale: Locale, period: Period): string {
  return msg(locale, period === "year" ? "common.perYear" : "common.perMonth");
}

/** Every row of the cost table, the residual value and the cost per kilometre. */
export async function expectCarCosts(
  page: Page,
  locale: Locale,
  car: Car,
  assumptions: Assumptions,
  period: Period,
): Promise<void> {
  const costs = costsOf(car, assumptions);
  const map = periodCosts(costs, period);
  const month = costs.perMonth;
  const share = (value: number) => percent(month.total > 0 ? value / month.total : 0, locale);

  const table = page
    .getByRole("main")
    .getByRole("table", { name: msg(locale, "costs.caption", { period: periodWord(locale, period) }) });
  await expect
    .poll(() => readTable(table), { message: "rows of the cost table" })
    .toEqual([
      ...CATEGORIES.map((key) => ({
        label: msg(locale, `costs.${key}`),
        cells: [estimateText(locale, pln(map[key], locale)), share(month[key])],
      })),
      { label: msg(locale, "costs.total"), cells: [estimateText(locale, pln(map.total, locale)), "100%"] },
    ]);

  const estimate = (chunks: string) => `≈${msg(locale, "common.estimateSr")} ${chunks}`;
  const residual = msg(locale, "car.residual", {
    years: msg(locale, "assumptions.yearsAfter", { count: assumptions.ownershipYears }),
    amount: pln(costs.residualValuePln, locale),
    percent: percent(costs.residualValuePct / 100, locale),
    value: estimate,
  });
  const perKm = msg(locale, "car.perKm", { amount: plnExact(costs.costPerKm, locale), value: estimate });
  const main = page.getByRole("main");
  await expect(main.getByText(exactly(residual))).toBeVisible();
  await expect(main.getByText(exactly(perKm))).toBeVisible();

  const lead = msg(locale, "car.costLead", {
    period: periodWord(locale, period),
    years: msg(locale, "assumptions.yearsValue", { count: assumptions.ownershipYears }),
  });
  await expect(main.getByText(exactly(lead))).toBeVisible();
}

/*
 * The earnings scale is based on the purchase price spread evenly over the months of
 * ownership plus the monthly fuel or energy cost. Insurance, servicing, parts, fees and
 * depreciation are left out. The amount is computed here from the car and the market
 * prices of the fixture data, without the application's own helper for it.
 */
export function affordabilityOf(car: Car, assumptions: Assumptions): number {
  return car.listPricePln / (assumptions.ownershipYears * 12) + costsOf(car, assumptions).perMonth.fuel;
}

/** Labels and notes of the four levels, word for word as the design gives them. */
export const LEVEL_TEXTS: Record<Locale, readonly { label: string; note: string }[]> = {
  pl: [
    { label: "komfortowo", note: "zakup i paliwo zajmują do 15% dochodu" },
    { label: "rozsądnie", note: "zakup i paliwo zajmują 15–20% dochodu" },
    { label: "na granicy", note: "zakup i paliwo zajmują 20–25% dochodu" },
    { label: "niezalecane", note: "zakup i paliwo zajmują ponad 25% dochodu" },
  ],
  en: [
    { label: "comfortable", note: "purchase and fuel take up to 15% of income" },
    { label: "reasonable", note: "purchase and fuel take 15–20% of income" },
    { label: "stretching it", note: "purchase and fuel take 20–25% of income" },
    { label: "not recommended", note: "purchase and fuel take over 25% of income" },
  ],
};

/** The sentence above the scale, word for word as the design gives it; `amount` stands for "≈ 1 234 zł". */
export function earningsIntroText(locale: Locale, period: Period, amount: string): string {
  if (locale === "pl") {
    return period === "year"
      ? `Cena auta rozłożona na lata posiadania i paliwo lub prąd to razem ${amount} rocznie. Skala pokazuje, przy jakim rocznym dochodzie netto (na rękę) ta kwota zajmuje daną część budżetu.`
      : `Cena auta rozłożona na miesiące posiadania i paliwo lub prąd to razem ${amount} miesięcznie. Skala pokazuje, przy jakim miesięcznym dochodzie netto (na rękę) ta kwota zajmuje daną część budżetu.`;
  }
  return period === "year"
    ? `The price of the car spread over the years you keep it, plus fuel or electricity, comes to ${amount} per year. The scale shows the net yearly income (take-home pay) at which this amount takes a given share of the budget.`
    : `The price of the car spread over the months you keep it, plus fuel or electricity, comes to ${amount} per month. The scale shows the net monthly income (take-home pay) at which this amount takes a given share of the budget.`;
}

/** An estimated amount as the text of the page reads it: the sign, the spoken word, the amount. */
function estimated(locale: Locale, amount: string): string {
  return `≈${msg(locale, "common.estimateSr")} ${amount}`;
}

export function earningsSection(page: Page, locale: Locale): Locator {
  return page.getByRole("region", { name: msg(locale, "car.earningsTitle"), exact: true });
}

/** The text of each level: label, income range, note. */
export async function readEarnings(page: Page, locale: Locale): Promise<string[]> {
  return (await earningsSection(page, locale).getByRole("listitem").allTextContents()).map(squash);
}

/** What the four levels must read for a monthly amount, in the given period. */
export function expectedLevels(locale: Locale, monthlyAmount: number, period: Period): string[] {
  const factor = period === "year" ? 12 : 1;
  return requiredIncome(monthlyAmount).map((range, index) => {
    const min = range.minIncomePln === null ? null : pln(range.minIncomePln * factor, locale);
    const max = range.maxIncomePln === null ? null : pln(range.maxIncomePln * factor, locale);
    const text =
      min !== null && max !== null
        ? msg(locale, "car.rangeBetween", { min, max })
        : min !== null
          ? msg(locale, "car.rangeFrom", { min })
          : msg(locale, "car.rangeTo", { max: max ?? "" });
    const { label, note } = LEVEL_TEXTS[locale][index];
    return squash(`${label}${text}${note}`);
  });
}

/** The amount the sentence above the scale must print, "1 234 zł", for the period. */
export function expectedEarningsAmount(locale: Locale, car: Car, assumptions: Assumptions, period: Period): string {
  const monthly = affordabilityOf(car, assumptions);
  return pln(period === "year" ? monthly * 12 : monthly, locale);
}

/**
 * The earnings section: the purchase-and-fuel amount in the sentence above the scale and
 * the four levels, in order, with their income ranges for that amount.
 */
export async function expectEarnings(
  page: Page,
  locale: Locale,
  car: Car,
  assumptions: Assumptions,
  period: Period,
): Promise<void> {
  await expect
    .poll(() => readEarnings(page, locale), { message: "levels of the earnings scale" })
    .toEqual(expectedLevels(locale, affordabilityOf(car, assumptions), period));

  const amount = expectedEarningsAmount(locale, car, assumptions, period);
  const intro = earningsIntroText(locale, period, estimated(locale, amount));
  await expect(earningsSection(page, locale).getByText(exactly(intro))).toBeVisible();
}
