import type { Page } from "@playwright/test";
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

/** The four levels of the earnings scale, in order, with their income ranges. */
export async function expectEarnings(
  page: Page,
  locale: Locale,
  car: Car,
  assumptions: Assumptions,
  period: Period,
): Promise<void> {
  const costs = costsOf(car, assumptions);
  const factor = period === "year" ? 12 : 1;
  const expected = requiredIncome(costs.perMonth.total).map((range) => {
    const min = range.minIncomePln === null ? null : pln(range.minIncomePln * factor, locale);
    const max = range.maxIncomePln === null ? null : pln(range.maxIncomePln * factor, locale);
    const text =
      min !== null && max !== null
        ? msg(locale, "car.rangeBetween", { min, max })
        : min !== null
          ? msg(locale, "car.rangeFrom", { min })
          : msg(locale, "car.rangeTo", { max: max ?? "" });
    return squash(
      `${msg(locale, `car.levels.${range.level}.label`)}${text}${msg(locale, `car.levels.${range.level}.note`)}`,
    );
  });

  const section = page.getByRole("region", { name: msg(locale, "car.earningsTitle"), exact: true });
  const levels = section.getByRole("listitem");
  await expect.poll(async () => (await levels.allTextContents()).map(squash)).toEqual(expected);

  const total = pln(periodCosts(costs, period).total, locale);
  const intro = msg(locale, period === "year" ? "car.earningsIntroYear" : "car.earningsIntroMonth", {
    amount: total,
    value: (chunks: string) => `≈${msg(locale, "common.estimateSr")} ${chunks}`,
  });
  await expect(section.getByText(exactly(intro))).toBeVisible();
}
