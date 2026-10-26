import type {
  BrandTier,
  DriverAgeBand,
  FuelType,
  MarketPriceKey,
  Segment,
  ValueRetention,
} from '@/lib/domain/types';

/**
 * Every parameter of the cost model. Values without a published source
 * (AC rate, power factors, servicing and parts rates, registration fee)
 * are calibrated estimates.
 */
export const COST_MODEL = {
  depreciation: {
    referenceMileageKm: 15000,
    // Residual value in percent of the list price after year 1..10 at the reference mileage.
    baseResidualPct: [82, 73, 65, 58, 52, 47, 42, 38, 34, 31],
    fuelFactor: {
      petrol: 1.0,
      diesel: 1.05,
      lpg: 1.0,
      hybrid: 0.92,
      phev: 1.12,
      ev: 1.35,
    } satisfies Record<FuelType, number>,
    retentionFactor: {
      high: 0.9,
      average: 1.0,
      low: 1.12,
    } satisfies Record<ValueRetention, number>,
    // Percentage points of extra loss per 1000 km above the reference mileage, per ownership year.
    mileagePointsPer1000KmPerYear: 0.2,
    minResidualPct: 10,
    maxResidualPct: 95,
  },
  fuel: {
    priceKeyByFuelType: {
      petrol: 'petrol',
      diesel: 'diesel',
      lpg: 'lpg',
      hybrid: 'petrol',
      phev: 'petrol',
      // An EV has no liquid fuel consumption, so this price is never applied.
      ev: 'electricity',
    } satisfies Record<FuelType, MarketPriceKey>,
    electricityKey: 'electricity' satisfies MarketPriceKey,
  },
  insurance: {
    ocByAgePln: {
      '18-24': 1866,
      '25-34': 763,
      '35-44': 609,
      '45-54': 594,
      '55-59': 563,
      '60-64': 550,
      '65-69': 581,
      '70-74': 672,
      '75+': 779,
    } satisfies Record<DriverAgeBand, number>,
    // Upper bounds (inclusive) in kW, ascending. Power above the last bound uses powerFactorAbove.
    powerFactorTiers: [
      { maxKw: 74, factor: 0.9 },
      { maxKw: 110, factor: 1.0 },
      { maxKw: 150, factor: 1.1 },
    ],
    powerFactorAbove: 1.25,
    acRateOfCurrentValue: 0.025,
    acAgeFactor: {
      '18-24': 2.0,
      '25-34': 1.25,
      '35-44': 1.0,
      '45-54': 1.0,
      '55-59': 1.0,
      '60-64': 1.0,
      '65-69': 1.0,
      '70-74': 1.1,
      '75+': 1.1,
    } satisfies Record<DriverAgeBand, number>,
  },
  service: {
    yearlyBasePln: {
      budget: 900,
      mainstream: 1200,
      premium: 2200,
    } satisfies Record<BrandTier, number>,
    evFactor: 0.6,
    otherFuelFactor: 1.0,
    referenceMileageKm: 20000,
  },
  parts: {
    ratePlnPerKm: {
      A: 0.06,
      B: 0.07,
      C: 0.09,
      D: 0.12,
      E: 0.16,
      F: 0.22,
    } satisfies Record<Segment, number>,
    tierFactor: {
      budget: 0.9,
      mainstream: 1.0,
      premium: 1.4,
    } satisfies Record<BrandTier, number>,
    evFactor: 0.9,
    otherFuelFactor: 1.0,
  },
  fees: {
    // Official total for a new car with new plates (gov.pl, checked 2026-10-11).
    registrationPln: 160,
    inspectionPln: 149,
    inspectionLpgPln: 245,
    // Ends of ownership years in which a periodic inspection is due.
    inspectionDueYears: [3, 5, 6, 7, 8, 9],
  },
  income: {
    // Share of net monthly income taken by the monthly base cost (purchase price spread over
    // the ownership months plus fuel or energy), per level upper bound.
    // Polish guidance (see the methodology page): transport up to 15-20% of net income;
    // other car costs come on top of the base, hence the last threshold of 25%.
    shareComfortable: 0.15,
    shareReasonable: 0.2,
    shareStretch: 0.25,
    roundingStepPln: 100,
  },
} as const;
