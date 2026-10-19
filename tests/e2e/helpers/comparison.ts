import type { Page } from "@playwright/test";
import type { Assumptions, Car, Period } from "@/lib/domain/types";
import { costsOf, periodCosts } from "./catalogue";
import { expect } from "./fixtures";
import { decimal, integer, longDate, msg, pln, squash, type Locale } from "./text";
import { readTable } from "./ui";

/*
 * The rows of the comparison table as the design defines them, with values from
 * the cost engine. A row marks its best value only when one car alone has it, as
 * printed (whole złoty); consumption is marked only when all cars use the same
 * unit and none is a plug-in hybrid; power is never marked.
 */

const COST_ROWS = ["depreciation", "fuel", "insurance", "service", "parts", "fees"] as const;

function single(values: number[], better: (a: number, b: number) => boolean): number | null {
  const best = values.reduce((acc, value) => (better(value, acc) ? value : acc), values[0]);
  return values.filter((value) => value === best).length === 1 ? values.indexOf(best) : null;
}
const lowest = (values: number[]) => single(values, (a, b) => a < b);
const highest = (values: number[]) => single(values, (a, b) => a > b);

function consumptionText(locale: Locale, car: Car): string {
  if (car.fuelL100 !== null && car.electricKwh100 !== null) {
    return msg(locale, "attr.consumptionPhev", {
      fuel: decimal(car.fuelL100, locale),
      electric: decimal(car.electricKwh100, locale),
    });
  }
  if (car.fuelL100 !== null) return `${decimal(car.fuelL100, locale)} ${msg(locale, "attr.consumptionFuel")}`;
  if (car.electricKwh100 !== null) {
    return `${decimal(car.electricKwh100, locale)} ${msg(locale, "attr.consumptionElectric")}`;
  }
  return "–";
}

function powerText(locale: Locale, car: Car): { value: string; note: string | null } {
  const hp = `${Math.round(car.powerKw * 1.35962)} ${msg(locale, "attr.horsepower")}`;
  const value = `${integer(car.powerKw, locale)} ${msg(locale, "attr.kilowatt")} (${hp})`;
  if (car.fuelType === "ev") return { value, note: msg(locale, "power.source.rowNote") };
  if (car.fuelType === "hybrid" || car.fuelType === "phev") {
    return { value, note: msg(locale, "power.engine.rowNote") };
  }
  return { value, note: null };
}

export interface ComparisonRowText {
  label: string;
  cells: string[];
}

export function expectedComparison(
  locale: Locale,
  cars: Car[],
  assumptions: Assumptions,
  period: Period,
): ComparisonRowText[] {
  const costs = cars.map((car) => costsOf(car, assumptions));
  const maps = costs.map((item) => periodCosts(item, period));
  const sr = msg(locale, "common.estimateSr");
  const lowestLabel = msg(locale, "compare.lowest");
  const highestLabel = msg(locale, "compare.highest");

  const cell = (value: string, estimate: boolean, best: boolean, bestLabel: string, note?: string | null) =>
    squash(`${estimate ? `≈${sr} ` : ""}${value}`) + (best ? bestLabel : "") + (note ? squash(note) : "");

  const rows: ComparisonRowText[] = [];
  const priceBest = lowest(cars.map((car) => car.listPricePln));
  rows.push({
    label: msg(locale, "compare.price"),
    cells: cars.map((car, index) =>
      cell(
        pln(car.listPricePln, locale),
        false,
        priceBest === index,
        lowestLabel,
        msg(locale, "compare.priceDate", { date: longDate(car.priceObservedAt, locale) }),
      ),
    ),
  });
  for (const key of [...COST_ROWS, "total"] as const) {
    const best = lowest(maps.map((map) => Math.round(map[key])));
    rows.push({
      label: msg(locale, `costs.${key}`),
      cells: maps.map((map, index) => cell(pln(map[key], locale), true, best === index, lowestLabel)),
    });
  }
  const residualBest = highest(costs.map((item) => Math.round(item.residualValuePln)));
  rows.push({
    label: msg(locale, "compare.residual", {
      years: msg(locale, "assumptions.yearsAfter", { count: assumptions.ownershipYears }),
    }),
    cells: costs.map((item, index) =>
      cell(pln(item.residualValuePln, locale), true, residualBest === index, highestLabel),
    ),
  });
  const sameUnit = new Set(cars.map((car) => car.fuelL100 !== null)).size === 1;
  const anyPlugIn = cars.some((car) => car.fuelType === "phev");
  const consumptionBest =
    sameUnit && !anyPlugIn
      ? lowest(cars.map((car) => Math.round((car.fuelL100 ?? car.electricKwh100 ?? 0) * 10)))
      : null;
  rows.push({
    label: msg(locale, "compare.consumption"),
    cells: cars.map((car, index) => cell(consumptionText(locale, car), false, consumptionBest === index, lowestLabel)),
  });
  rows.push({
    label: msg(locale, "compare.power"),
    cells: cars.map((car) => {
      const power = powerText(locale, car);
      return cell(power.value, false, false, "", power.note);
    }),
  });
  return rows;
}

export function comparisonTable(page: Page, locale: Locale, period: Period) {
  const periodWord = msg(locale, period === "year" ? "common.perYear" : "common.perMonth");
  return page.getByRole("main").getByRole("table", { name: msg(locale, "compare.caption", { period: periodWord }) });
}

export async function expectComparison(
  page: Page,
  locale: Locale,
  cars: Car[],
  assumptions: Assumptions,
  period: Period,
): Promise<void> {
  await expect
    .poll(() => readTable(comparisonTable(page, locale, period)), { message: "rows of the comparison table" })
    .toEqual(expectedComparison(locale, cars, assumptions, period));
}
