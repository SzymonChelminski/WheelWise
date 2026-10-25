import type { CostBreakdownItem } from "@/components/ui/CostBreakdown";
import { COST_ORDER } from "@/components/ui/CostStrip";
import type { EarningsLevel } from "@/components/ui/EarningsScale";
import { requiredIncome, type CostBreakdown, type CostMap } from "@/lib/costs";
import type { Car, Period } from "@/lib/domain/types";
import { formatDecimal, formatInteger, formatPercent, formatPln, type Locale } from "@/lib/format";
import { horsepower, powerKind, type Translate } from "./car-view";

/* Formatting of the values the car and comparison pages print. Nothing here calculates a cost. */

const MISSING = "–";

/** The cost map of the chosen period. */
export function periodMap(costs: CostBreakdown, period: Period): CostMap {
  return period === "year" ? costs.perYear : costs.perMonth;
}

/** Full value of the power attribute: "67 kW (91 KM)". */
export function powerValue(t: Translate, locale: Locale, car: Pick<Car, "powerKw">): string {
  return `${formatInteger(car.powerKw, locale)} ${t("attr.kilowatt")} (${horsepower(car.powerKw, t)})`;
}

/** What kind of power the source gives for this car: the term of the power attribute. */
export function powerLabel(t: Translate, car: Pick<Car, "fuelType">): string {
  return t(`power.${powerKind(car.fuelType)}.label`);
}

/** The kind of power as a short phrase and as a sentence; null for plain engine power. */
export function powerNotes(
  t: Translate,
  car: Pick<Car, "fuelType">,
): { row: string; sentence: string } | null {
  const kind = powerKind(car.fuelType);
  if (kind === "plain") return null;
  return { row: t(`power.${kind}.rowNote`), sentence: t(`power.${kind}.note`) };
}

/** WLTP consumption: "5,3 l/100 km", "14,4 kWh/100 km", or both for a plug-in hybrid. */
export function consumptionText(
  t: Translate,
  locale: Locale,
  car: Pick<Car, "fuelL100" | "electricKwh100">,
): string {
  const { fuelL100, electricKwh100 } = car;
  if (fuelL100 !== null && electricKwh100 !== null) {
    return t("attr.consumptionPhev", {
      fuel: formatDecimal(fuelL100, locale),
      electric: formatDecimal(electricKwh100, locale),
    });
  }
  if (fuelL100 !== null) return `${formatDecimal(fuelL100, locale)} ${t("attr.consumptionFuel")}`;
  if (electricKwh100 !== null) {
    return `${formatDecimal(electricKwh100, locale)} ${t("attr.consumptionElectric")}`;
  }
  return MISSING;
}

export function engineSizeText(t: Translate, locale: Locale, car: Pick<Car, "engineCc">): string {
  return car.engineCc ? t("attr.engineSize", { value: formatInteger(car.engineCc, locale) }) : MISSING;
}

/** The six categories with their amount for the period and their share of the total. */
export function breakdownItems(
  t: Translate,
  locale: Locale,
  costs: CostBreakdown,
  period: Period,
): CostBreakdownItem[] {
  const map = periodMap(costs, period);
  const whole = costs.perMonth.total;
  return COST_ORDER.map((key) => {
    const share = whole > 0 ? costs.perMonth[key] / whole : 0;
    return {
      key,
      label: t(`costs.${key}`),
      amount: formatPln(map[key], locale),
      share,
      shareText: formatPercent(share, locale),
    };
  });
}

/** Cost shares for a strip. */
export function costShares(costs: CostBreakdown): Record<(typeof COST_ORDER)[number], number> {
  const whole = costs.perMonth.total;
  return Object.fromEntries(
    COST_ORDER.map((key) => [key, whole > 0 ? costs.perMonth[key] / whole : 0]),
  ) as Record<(typeof COST_ORDER)[number], number>;
}

/**
 * The four levels of the earnings scale for the monthly affordability cost (purchase spread
 * over the ownership months plus fuel); a year is twelve times the monthly amounts.
 */
export function earningsLevels(
  t: Translate,
  locale: Locale,
  monthlyAffordabilityPln: number,
  period: Period,
): EarningsLevel[] {
  const factor = period === "year" ? 12 : 1;
  return requiredIncome(monthlyAffordabilityPln).map((range) => {
    const min = range.minIncomePln === null ? null : formatPln(range.minIncomePln * factor, locale);
    const max = range.maxIncomePln === null ? null : formatPln(range.maxIncomePln * factor, locale);
    let text: string;
    if (min !== null && max !== null) text = t("car.rangeBetween", { min, max });
    else if (min !== null) text = t("car.rangeFrom", { min });
    else text = t("car.rangeTo", { max: max ?? MISSING });
    return {
      level: range.level,
      label: t(`car.levels.${range.level}.label`),
      note: t(`car.levels.${range.level}.note`),
      range: text,
    };
  });
}
