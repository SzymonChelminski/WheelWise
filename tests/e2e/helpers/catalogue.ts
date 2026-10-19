import carsFixture from "../../../data/fixtures/cars.json";
import pricesFixture from "../../../data/fixtures/market-prices.json";
import {
  calculateCosts,
  rankCars,
  requiredIncome,
  type CostBreakdown,
  type CostMap,
  type RankedCar,
  type RankingFilters,
  type RankingMetric,
} from "@/lib/costs";
import type {
  Assumptions,
  Car,
  CarInput,
  DriverAgeBand,
  MarketPrice,
  MarketPrices,
  Period,
} from "@/lib/domain/types";

/*
 * The data the application serves when it runs without a database: the committed
 * fixture catalogue and market prices. Every expected number in the end-to-end
 * tests is computed here, in the test process, with the same cost engine.
 */

export const cars: Car[] = (carsFixture as unknown as CarInput[]).map((car, index) => ({
  ...car,
  id: index + 1,
}));

export const prices: MarketPrices = Object.fromEntries(
  (pricesFixture as unknown as MarketPrice[])
    .filter((price) => price.key !== "eur_pln")
    .map((price) => [price.key, price]),
) as MarketPrices;

/** Assumptions a visitor gets without choosing anything. */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  annualMileageKm: 15000,
  ownershipYears: 5,
  insurance: { mode: "estimate", driverAgeBand: "35-44", coverage: "oc_ac" },
};

export interface AssumptionChanges {
  km?: number;
  years?: number;
  age?: DriverAgeBand;
  coverage?: "oc" | "oc_ac";
  /** Own yearly premium; switches insurance to the custom mode. */
  premium?: number;
}

export function assumptionsWith(changes: AssumptionChanges = {}): Assumptions {
  const base = DEFAULT_ASSUMPTIONS;
  const estimate = base.insurance as Extract<Assumptions["insurance"], { mode: "estimate" }>;
  return {
    annualMileageKm: changes.km ?? base.annualMileageKm,
    ownershipYears: changes.years ?? base.ownershipYears,
    insurance:
      changes.premium !== undefined
        ? { mode: "custom", annualPremiumPln: changes.premium }
        : {
            mode: "estimate",
            driverAgeBand: changes.age ?? estimate.driverAgeBand,
            coverage: changes.coverage ?? estimate.coverage,
          },
  };
}

export const METRICS: readonly RankingMetric[] = [
  "price",
  "totalCost",
  "depreciation",
  "maintenance",
  "service",
  "parts",
  "fuelConsumption",
  "fuelCost",
  "insurance",
];

export function ranking(
  metric: RankingMetric,
  filters: RankingFilters = {},
  assumptions: Assumptions = DEFAULT_ASSUMPTIONS,
): RankedCar[] {
  return rankCars(cars, prices, assumptions, metric, filters);
}

export function carBySlug(slug: string): Car {
  const car = cars.find((item) => item.slug === slug);
  if (!car) throw new Error(`No car with the slug ${slug} in the fixture catalogue`);
  return car;
}

export function costsOf(car: Car, assumptions: Assumptions = DEFAULT_ASSUMPTIONS): CostBreakdown {
  return calculateCosts(car, prices, assumptions);
}

export function periodCosts(costs: CostBreakdown, period: Period): CostMap {
  return period === "year" ? costs.perYear : costs.perMonth;
}

export { requiredIncome };

/** "Make Variant": the name of a car everywhere on the site. */
export function nameOf(car: Pick<Car, "make" | "variant">): string {
  return `${car.make} ${car.variant}`;
}

/** The cheapest car (by list price) that satisfies `test`. */
export function cheapest(test: (car: Car) => boolean): Car {
  const found = ranking("price").find((item) => test(item.car));
  if (!found) throw new Error("No car in the fixture catalogue matches");
  return found.car;
}

/** The field of the cost breakdown behind a cost metric. */
export const COST_FIELD: Partial<Record<RankingMetric, keyof CostMap>> = {
  totalCost: "total",
  depreciation: "depreciation",
  maintenance: "maintenance",
  service: "service",
  parts: "parts",
  fuelCost: "fuel",
  insurance: "insurance",
};
