import type {
  Assumptions,
  BodyType,
  Car,
  FuelType,
  MarketPrices,
  Segment,
  Transmission,
} from '@/lib/domain/types';
import { calculateCosts, type CostBreakdown } from './calculate';

export type RankingMetric =
  | 'price'
  | 'totalCost'
  | 'depreciation'
  | 'maintenance'
  | 'service'
  | 'parts'
  | 'fuelConsumption'
  | 'fuelCost'
  | 'insurance';

export interface RankingFilters {
  makes?: string[];
  segments?: Segment[];
  bodyTypes?: BodyType[];
  fuelTypes?: FuelType[];
  transmission?: Transmission;
  priceMin?: number;
  priceMax?: number;
  query?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface RankedCar {
  car: Car;
  costs: CostBreakdown;
  value: number;
  rank: number;
}

function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** An undefined or empty list means "no restriction". */
function allows<T>(selected: readonly T[] | undefined, value: T): boolean {
  return !selected || selected.length === 0 || selected.includes(value);
}

function matchesFilters(car: Car, filters: RankingFilters): boolean {
  if (filters.makes && filters.makes.length > 0) {
    const make = car.make.toLowerCase();
    if (!filters.makes.some((m) => m.toLowerCase() === make)) return false;
  }
  if (!allows(filters.segments, car.segment)) return false;
  if (!allows(filters.bodyTypes, car.bodyType)) return false;
  if (!allows(filters.fuelTypes, car.fuelType)) return false;
  if (filters.transmission && filters.transmission !== car.transmission) return false;
  if (filters.priceMin !== undefined && car.listPricePln < filters.priceMin) return false;
  if (filters.priceMax !== undefined && car.listPricePln > filters.priceMax) return false;

  const words = normalizeText(filters.query ?? '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 0) {
    const haystack = normalizeText(`${car.make} ${car.model} ${car.variant}`);
    if (!words.every((word) => haystack.includes(word))) return false;
  }
  return true;
}

function isElectricOnly(filters: RankingFilters): boolean {
  return filters.fuelTypes?.length === 1 && filters.fuelTypes[0] === 'ev';
}

/** The ranked value of a car, or null when the car has no place in this ranking. */
function metricValue(
  car: Car,
  costs: CostBreakdown,
  metric: RankingMetric,
  filters: RankingFilters,
): number | null {
  switch (metric) {
    case 'price':
      return car.listPricePln;
    case 'totalCost':
      return costs.perMonth.total;
    case 'fuelCost':
      return costs.perMonth.fuel;
    case 'depreciation':
    case 'maintenance':
    case 'service':
    case 'parts':
    case 'insurance':
      return costs.perMonth[metric];
    case 'fuelConsumption': {
      const electricOnly = isElectricOnly(filters);
      if (car.fuelType === 'phev' || (car.fuelType === 'ev' && !electricOnly)) return null;
      return electricOnly ? car.electricKwh100 : car.fuelL100;
    }
  }
}

/**
 * Filtered cars sorted by the metric, lowest value first or (`desc`) highest first. Ties are
 * always by slug ascending. Cars without a value are not ranked. Rank is the 1-based position.
 */
export function rankCars(
  cars: Car[],
  prices: MarketPrices,
  a: Assumptions,
  metric: RankingMetric,
  filters: RankingFilters,
  direction: SortDirection = 'asc',
): RankedCar[] {
  const entries: Omit<RankedCar, 'rank'>[] = [];

  for (const car of cars) {
    if (!matchesFilters(car, filters)) continue;
    const costs = calculateCosts(car, prices, a);
    const value = metricValue(car, costs, metric, filters);
    if (value !== null) entries.push({ car, costs, value });
  }

  const sign = direction === 'desc' ? -1 : 1;
  entries.sort((x, y) => sign * (x.value - y.value) || (x.car.slug < y.car.slug ? -1 : 1));
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
