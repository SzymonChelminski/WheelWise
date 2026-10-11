import type {
  Assumptions,
  Car,
  CarInput,
  DriverAgeBand,
  FuelType,
  MarketPriceKey,
  MarketPrices,
} from '@/lib/domain/types';

/**
 * Builders for unit tests. Every value here is a literal written from
 * the cost model specification; nothing is read from src/config.
 */

export const FUEL_TYPES: readonly FuelType[] = ['petrol', 'diesel', 'lpg', 'hybrid', 'phev', 'ev'];

export const AGE_BANDS: readonly DriverAgeBand[] = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-59',
  '60-64',
  '65-69',
  '70-74',
  '75+',
];

/** The reference car of the cost model, as catalogue input (no id). */
export function makeCarInput(overrides: Partial<CarInput> = {}): CarInput {
  return {
    slug: 'test-reference-car',
    make: 'Testa',
    model: 'REFERENCE',
    variant: 'Reference 1.5 Base',
    bodyType: 'sedan_hatchback',
    segment: 'C',
    fuelType: 'petrol',
    transmission: 'manual',
    powerKw: 96,
    engineCc: 1498,
    brandTier: 'mainstream',
    valueRetention: 'average',
    priceEur: 23000,
    listPricePln: 100000,
    priceObservedAt: '2026-10-01',
    priceSourceUrl: 'https://example.org/dataset',
    fuelL100: 6.0,
    electricKwh100: null,
    ...overrides,
  };
}

/** The reference car of the cost model. */
export function makeCar(overrides: Partial<Car> = {}): Car {
  return { id: 1, ...makeCarInput(), ...overrides };
}

/** Typical consumption values that satisfy the consumption rules of the car schema. */
const CONSUMPTION_BY_FUEL: Record<FuelType, Pick<CarInput, 'fuelL100' | 'electricKwh100'>> = {
  petrol: { fuelL100: 6.0, electricKwh100: null },
  diesel: { fuelL100: 5.0, electricKwh100: null },
  lpg: { fuelL100: 8.0, electricKwh100: null },
  hybrid: { fuelL100: 4.5, electricKwh100: null },
  phev: { fuelL100: 1.5, electricKwh100: 16 },
  ev: { fuelL100: null, electricKwh100: 17 },
};

/** A schema-valid car of the given fuel type (consumption fields set accordingly). */
export function makeCarOfFuel(fuelType: FuelType, overrides: Partial<Car> = {}): Car {
  return makeCar({
    slug: `test-${fuelType}`,
    fuelType,
    engineCc: fuelType === 'ev' ? null : 1498,
    ...CONSUMPTION_BY_FUEL[fuelType],
    ...overrides,
  });
}

/** Same as `makeCarOfFuel`, without the id (input of `carInputSchema`). */
export function makeCarInputOfFuel(fuelType: FuelType, overrides: Partial<CarInput> = {}): CarInput {
  return makeCarInput({
    slug: `test-${fuelType}`,
    fuelType,
    engineCc: fuelType === 'ev' ? null : 1498,
    ...CONSUMPTION_BY_FUEL[fuelType],
    ...overrides,
  });
}

/** Market prices of the reference case: petrol 6.50, diesel 6.60, lpg 3.10, electricity 1.27. */
export function makePrices(overrides: Partial<Record<MarketPriceKey, number>> = {}): MarketPrices {
  const values: Record<MarketPriceKey, number> = {
    petrol: 6.5,
    diesel: 6.6,
    lpg: 3.1,
    electricity: 1.27,
    ...overrides,
  };
  const entry = (key: MarketPriceKey) => ({
    key,
    pricePln: values[key],
    observedAt: '2026-10-01',
    source: 'test',
    sourceUrl: 'https://example.org/prices',
  });
  return {
    petrol: entry('petrol'),
    diesel: entry('diesel'),
    lpg: entry('lpg'),
    electricity: entry('electricity'),
  };
}

/** Assumptions of the reference case: 15000 km, 5 years, estimate, 35-44, OC + AC. */
export function makeAssumptions(overrides: Partial<Assumptions> = {}): Assumptions {
  return {
    annualMileageKm: 15000,
    ownershipYears: 5,
    insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc_ac' },
    ...overrides,
  };
}

/** Estimate-mode assumptions with the given driver age band and coverage. */
export function estimate(
  driverAgeBand: DriverAgeBand,
  coverage: 'oc' | 'oc_ac',
  overrides: Partial<Omit<Assumptions, 'insurance'>> = {},
): Assumptions {
  return makeAssumptions({
    ...overrides,
    insurance: { mode: 'estimate', driverAgeBand, coverage },
  });
}

/** Custom-premium assumptions. */
export function custom(
  annualPremiumPln: number,
  overrides: Partial<Omit<Assumptions, 'insurance'>> = {},
): Assumptions {
  return makeAssumptions({ ...overrides, insurance: { mode: 'custom', annualPremiumPln } });
}
