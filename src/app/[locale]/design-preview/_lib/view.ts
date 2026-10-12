/*
 * Turns mock data into the formatted props the components expect.
 * Formatting and picking only; every amount comes from src/mocks.
 */
import { createElement, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { CarMeta, type PowerText } from "@/components/ui/CarMeta";
import type { ComparisonCar, ComparisonRow } from "@/components/ui/ComparisonTable";
import type { CostBreakdownItem } from "@/components/ui/CostBreakdown";
import { COST_ORDER } from "@/components/ui/CostStrip";
import type { EarningsLevel } from "@/components/ui/EarningsScale";
import {
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPln,
  type Locale,
} from "@/components/ui/format";
import type { SearchOption } from "@/components/ui/SearchCombobox";
import { mockCars, mockCosts, mockStressSlugs } from "@/mocks/cars";
import { copy } from "@/mocks/copy";
import type { Car, CostBreakdown, CostKey, IncomeRange, Period } from "@/mocks/types";

/** Every preview page starts with this call. */
export function assertDesignPreview(): void {
  if (process.env.NEXT_PUBLIC_DESIGN_PREVIEW !== "1") notFound();
}

export function toLocale(value: string): Locale {
  return value === "en" ? "en" : "pl";
}

export const P = "/design-preview";

export function carName(car: Car): string {
  return `${car.make} ${car.variant}`;
}

export function horsepower(car: Car, locale: Locale): string {
  return `${Math.round(car.powerKw * 1.35962)} ${copy[locale].attr.horsepower}`;
}

/**
 * Which power label a car gets: the source gives engine power for
 * petrol, diesel and LPG, the combustion engine only for hybrids, and usually
 * the rated power for electric cars.
 */
export function powerKind(car: Car): "plain" | "engine" | "source" {
  if (car.fuelType === "ev") return "source";
  return car.fuelType === "hybrid" || car.fuelType === "phev" ? "engine" : "plain";
}

/** Full value: "67 kW (91 KM)". */
export function powerValue(car: Car, locale: Locale): string {
  return `${formatInteger(car.powerKw, locale)} kW (${horsepower(car, locale)})`;
}

/** Short and full text of the power label. The full text is "<full label>: <value>". */
export function powerText(car: Car, locale: Locale): PowerText {
  const t = copy[locale].power[powerKind(car)];
  return {
    short: t.short(horsepower(car, locale)),
    full: `${t.label}: ${powerValue(car, locale)}`,
  };
}

/** Attributes that always accompany a car name: body type, fuel, gearbox, power. */
export function carMeta(car: Car, locale: Locale): ReactNode {
  const t = copy[locale].attr;
  return createElement(CarMeta, {
    attributes: [t.body[car.bodyType], t.fuel[car.fuelType], t.transmission[car.transmission]],
    power: powerText(car, locale),
  });
}

export function consumption(car: Car, locale: Locale): string {
  const t = copy[locale].attr;
  const fuel = car.fuelL100 !== null ? `${formatDecimal(car.fuelL100, locale)} l` : null;
  const electric =
    car.electricKwh100 !== null ? `${formatDecimal(car.electricKwh100, locale)} kWh` : null;
  if (fuel && electric) return `${fuel} + ${electric} /100 km`;
  if (fuel) return `${formatDecimal(car.fuelL100!, locale)} ${t.consumptionFuel}`;
  if (electric) return `${formatDecimal(car.electricKwh100!, locale)} ${t.consumptionElectric}`;
  return "–";
}

export function shares(costs: CostBreakdown): Record<CostKey, number> {
  const total = costs.perMonth.total;
  return Object.fromEntries(
    COST_ORDER.map((key) => [key, costs.perMonth[key] / total]),
  ) as Record<CostKey, number>;
}

export function periodMap(costs: CostBreakdown, period: Period) {
  return period === "month" ? costs.perMonth : costs.perYear;
}

export function breakdownItems(
  costs: CostBreakdown,
  period: Period,
  locale: Locale,
): CostBreakdownItem[] {
  const map = periodMap(costs, period);
  const share = shares(costs);
  return COST_ORDER.map((key) => ({
    key,
    label: copy[locale].costs[key],
    amount: formatPln(map[key], locale),
    share: share[key],
    shareText: formatPercent(share[key], locale),
  }));
}

export function earningsLevels(ranges: IncomeRange[], locale: Locale): EarningsLevel[] {
  const t = copy[locale].car;
  return ranges.map((range) => {
    const min = range.minIncomePln !== null ? formatPln(range.minIncomePln, locale) : null;
    const max = range.maxIncomePln !== null ? formatPln(range.maxIncomePln, locale) : null;
    return {
      level: range.level,
      label: t.levels[range.level].label,
      note: t.levels[range.level].note,
      range: min && max ? t.rangeBetween(min, max) : min ? t.rangeFrom(min) : t.rangeTo(max ?? ""),
    };
  });
}

export function searchOptions(locale: Locale): SearchOption[] {
  return mockCars.filter((car) => !mockStressSlugs.includes(car.slug)).map((car) => ({
    id: car.slug,
    href: `${P}/car`,
    title: carName(car),
    meta: carMeta(car, locale),
    trailing: formatPln(car.listPricePln, locale),
  }));
}

function lowest(values: number[]): number | null {
  const min = Math.min(...values);
  return values.filter((value) => value === min).length === 1 ? values.indexOf(min) : null;
}

function highest(values: number[]): number | null {
  const max = Math.max(...values);
  return values.filter((value) => value === max).length === 1 ? values.indexOf(max) : null;
}

export function comparison(
  slugs: string[],
  period: Period,
  locale: Locale,
): { cars: ComparisonCar[]; rows: ComparisonRow[] } {
  const t = copy[locale];
  const cars = slugs.map((slug) => mockCars.find((car) => car.slug === slug)!);
  const costs = cars.map((car) => mockCosts[car.slug]);
  const maps = costs.map((item) => periodMap(item, period));
  const years = t.assumptions.yearsAfter[4];

  const costRow = (key: CostKey | "total", extra: Partial<ComparisonRow> = {}): ComparisonRow => ({
    key,
    label: key === "total" ? t.compare.total : t.costs[key],
    values: maps.map((map) => formatPln(map[key], locale)),
    best: lowest(maps.map((map) => map[key])),
    bestLabel: t.compare.lowest,
    estimate: true,
    ...extra,
  });

  const sameUnit = new Set(cars.map((car) => (car.fuelL100 !== null ? "l" : "kwh"))).size === 1;
  const hasPhev = cars.some((car) => car.fuelType === "phev");

  return {
    cars: cars.map((car, index) => ({
      slug: car.slug,
      href: `${P}/car`,
      make: car.make,
      variant: car.variant,
      meta: carMeta(car, locale),
      shares: shares(costs[index]),
    })),
    rows: [
      {
        key: "price",
        label: t.compare.price,
        values: cars.map((car) => formatPln(car.listPricePln, locale)),
        best: lowest(cars.map((car) => car.listPricePln)),
        bestLabel: t.compare.lowest,
      },
      costRow("depreciation", { groupStart: true }),
      costRow("fuel"),
      costRow("insurance"),
      costRow("service"),
      costRow("parts"),
      costRow("fees"),
      costRow("total", { emphasis: true }),
      {
        key: "residual",
        label: t.compare.residual(years),
        values: costs.map((item) => formatPln(item.residualValuePln, locale)),
        best: highest(costs.map((item) => item.residualValuePln)),
        bestLabel: t.compare.highest,
        estimate: true,
        groupStart: true,
      },
      {
        key: "consumption",
        label: t.compare.consumption,
        values: cars.map((car) => consumption(car, locale)),
        best:
          sameUnit && !hasPhev
            ? lowest(cars.map((car) => car.fuelL100 ?? car.electricKwh100 ?? 0))
            : null,
        bestLabel: t.compare.lowest,
      },
      {
        key: "power",
        label: t.compare.power,
        values: cars.map((car) => powerValue(car, locale)),
        notes: cars.map((car) => t.power[powerKind(car)].rowNote || null),
        best: null,
        bestLabel: "",
      },
    ],
  };
}

export { formatInteger, formatPln };
