import { describe, expect, it } from 'vitest';
import { calculateCosts, type CostMap } from '@/lib/costs';
import { assumptionsSchema } from '@/lib/domain/schemas';
import type { Assumptions, BrandTier, Segment, ValueRetention } from '@/lib/domain/types';
import {
  FUEL_TYPES,
  custom,
  estimate,
  makeAssumptions,
  makeCar,
  makeCarOfFuel,
  makePrices,
} from '../helpers/cars';

const COST_MAP_KEYS = [
  'depreciation',
  'fuel',
  'insurance',
  'service',
  'parts',
  'fees',
  'total',
  'maintenance',
] as const;

function expectCostMap(actual: CostMap, expected: CostMap, label: string) {
  expect(Object.keys(actual).sort(), `${label} keys`).toEqual([...COST_MAP_KEYS].sort());
  for (const key of COST_MAP_KEYS) {
    expect(actual[key], `${label}.${key}`).toBeCloseTo(expected[key], 6);
  }
}

describe('calculateCosts - reference case of the cost model', () => {
  // P = 100000, petrol, segment C, mainstream, average retention, 96 kW, 6.0 l/100 km,
  // petrol 6.50; 15000 km, 5 years, estimate, 35-44, OC + AC.
  const costs = calculateCosts(makeCar(), makePrices(), makeAssumptions());

  it('residual value is 52% of the price, 52 000 PLN', () => {
    expect(costs.residualValuePct).toBeCloseTo(52, 9);
    expect(costs.residualValuePln).toBeCloseTo(52000, 6);
    expect(costs.purchasePricePln).toBe(100000);
  });

  it('depreciation over ownership is 48 000 PLN', () => {
    expect(costs.overOwnership.depreciation).toBeCloseTo(48000, 6);
  });

  it('fuel per year is 5 850 PLN', () => {
    expect(costs.perYear.fuel).toBeCloseTo(5850, 6);
  });

  it('servicing per year is 1 200 PLN', () => {
    expect(costs.perYear.service).toBeCloseTo(1200, 6);
  });

  it('parts per year are 1 350 PLN', () => {
    expect(costs.perYear.parts).toBeCloseTo(1350, 6);
  });

  it('fees over ownership are 160 + 149 = 309 PLN', () => {
    expect(costs.overOwnership.fees).toBeCloseTo(309, 6);
  });

  it('insurance over ownership is 12 495 PLN', () => {
    // 5 * 609 + 100000 * 0.025 * (1 + 0.82 + 0.73 + 0.65 + 0.58)
    expect(costs.overOwnership.insurance).toBeCloseTo(12495, 6);
  });

  it('total over ownership is 102 804 PLN', () => {
    expect(costs.overOwnership.total).toBeCloseTo(102804, 6);
  });

  it('total per month is 1 713.40 PLN', () => {
    expect(costs.perMonth.total).toBeCloseTo(1713.4, 6);
  });

  it('every key of the three cost maps equals the hand-computed value', () => {
    expectCostMap(
      costs.overOwnership,
      {
        depreciation: 48000,
        fuel: 29250,
        insurance: 12495,
        service: 6000,
        parts: 6750,
        fees: 309,
        total: 102804,
        maintenance: 13059,
      },
      'overOwnership',
    );
    expectCostMap(
      costs.perYear,
      {
        depreciation: 9600,
        fuel: 5850,
        insurance: 2499,
        service: 1200,
        parts: 1350,
        fees: 61.8,
        total: 20560.8,
        maintenance: 2611.8,
      },
      'perYear',
    );
    expectCostMap(
      costs.perMonth,
      {
        depreciation: 800,
        fuel: 487.5,
        insurance: 208.25,
        service: 100,
        parts: 112.5,
        fees: 5.15,
        total: 1713.4,
        maintenance: 217.65,
      },
      'perMonth',
    );
    // 102804 / (15000 * 5)
    expect(costs.costPerKm).toBeCloseTo(1.37072, 9);
  });
});

describe('calculateCosts - totals and periods (second case)', () => {
  // diesel, segment D, premium, low retention, 140 kW, 5.5 l/100 km, P = 200000;
  // diesel 6.60; 30000 km, 4 years, estimate, 25-34, OC + AC.
  //
  // depreciation: 42 * 1.05 * 1.12 = 49.392; + 15 * 0.2 * 4 = 12 -> loss 61.392, residual 38.608%
  //               -> 77216 PLN left, 122784 PLN lost
  // fuel:         300 * 5.5 * 6.60 = 10890 per year -> 43560
  // insurance:    OC 763 * 1.10 = 839.3 per year -> 3357.2
  //               AC 200000 * 0.025 * 1.25 = 6250 * (1 + 0.75832 + 0.62248 + 0.4984) = 17995
  //               (residuals: y1 100 - (18 * 1.176 + 3); y2 100 - (27 * 1.176 + 6); y3 100 - (35 * 1.176 + 9))
  //               -> 21352.2
  // service:      2200 * 30000 / 20000 = 3300 per year -> 13200
  // parts:        30000 * 0.12 * 1.40 = 5040 per year -> 20160
  // fees:         160 + 1 * 149 = 309
  const car = makeCarOfFuel('diesel', {
    segment: 'D',
    brandTier: 'premium',
    valueRetention: 'low',
    powerKw: 140,
    fuelL100: 5.5,
    listPricePln: 200000,
  });
  const assumptions = estimate('25-34', 'oc_ac', { annualMileageKm: 30000, ownershipYears: 4 });
  const costs = calculateCosts(car, makePrices(), assumptions);

  it('overOwnership holds the six cost keys computed by hand', () => {
    expect(costs.overOwnership.depreciation).toBeCloseTo(122784, 6);
    expect(costs.overOwnership.fuel).toBeCloseTo(43560, 6);
    expect(costs.overOwnership.insurance).toBeCloseTo(21352.2, 6);
    expect(costs.overOwnership.service).toBeCloseTo(13200, 6);
    expect(costs.overOwnership.parts).toBeCloseTo(20160, 6);
    expect(costs.overOwnership.fees).toBeCloseTo(309, 6);
  });

  it('total is the sum of the six keys', () => {
    // 122784 + 43560 + 21352.2 + 13200 + 20160 + 309
    expect(costs.overOwnership.total).toBeCloseTo(221365.2, 6);
  });

  it('maintenance is service + parts + fees', () => {
    // 13200 + 20160 + 309
    expect(costs.overOwnership.maintenance).toBeCloseTo(33669, 6);
  });

  it('perYear is overOwnership / Y for every key, total and maintenance', () => {
    expectCostMap(
      costs.perYear,
      {
        depreciation: 30696,
        fuel: 10890,
        insurance: 5338.05,
        service: 3300,
        parts: 5040,
        fees: 77.25,
        total: 55341.3,
        maintenance: 8417.25,
      },
      'perYear',
    );
  });

  it('perMonth is overOwnership / (Y * 12) for every key, total and maintenance', () => {
    expectCostMap(
      costs.perMonth,
      {
        depreciation: 2558,
        fuel: 907.5,
        insurance: 444.8375,
        service: 275,
        parts: 420,
        fees: 6.4375,
        total: 4611.775,
        maintenance: 701.4375,
      },
      'perMonth',
    );
  });

  it('costPerKm is the total over ownership divided by K * Y', () => {
    // 221365.2 / 120000
    expect(costs.costPerKm).toBeCloseTo(1.84471, 9);
  });

  it('residual value and purchase price are reported', () => {
    expect(costs.purchasePricePln).toBe(200000);
    expect(costs.residualValuePct).toBeCloseTo(38.608, 9);
    expect(costs.residualValuePln).toBeCloseTo(77216, 6);
  });
});

describe('calculateCosts - one year of ownership', () => {
  // Reference car, 1 year: depreciation 18000, fuel 5850, insurance 609 + 2500, service 1200,
  // parts 1350, fees 160 -> 29669
  const costs = calculateCosts(makeCar(), makePrices(), makeAssumptions({ ownershipYears: 1 }));

  it('with Y = 1, perYear equals overOwnership', () => {
    const expected = {
      depreciation: 18000,
      fuel: 5850,
      insurance: 3109,
      service: 1200,
      parts: 1350,
      fees: 160,
      total: 29669,
      maintenance: 2710,
    };
    expectCostMap(costs.overOwnership, expected, 'overOwnership');
    expectCostMap(costs.perYear, expected, 'perYear');
  });

  it('with Y = 1, perMonth is one twelfth and costPerKm uses one year of mileage', () => {
    // 29669 / 12 and 29669 / 15000
    expect(costs.perMonth.total).toBeCloseTo(2472.4166666667, 6);
    expect(costs.perMonth.fuel).toBeCloseTo(487.5, 6);
    expect(costs.costPerKm).toBeCloseTo(1.9779333333, 9);
  });
});

describe('calculateCosts - values are not rounded', () => {
  it('perMonth.total keeps its fractional part (ev, 3 years)', () => {
    // ev, P = 100000, 17 kWh, 3 years, custom premium 1000:
    // depreciation 35 * 1.35 = 47.25% -> 47250; fuel 150 * 17 * 1.27 = 3238.5 * 3 = 9715.5;
    // insurance 3000; service 720 * 3 = 2160; parts 1215 * 3 = 3645; fees 160 -> 65930.5
    const costs = calculateCosts(
      makeCarOfFuel('ev'),
      makePrices(),
      custom(1000, { ownershipYears: 3 }),
    );
    expect(costs.overOwnership.total).toBeCloseTo(65930.5, 6);
    // 65930.5 / 36
    expect(costs.perMonth.total).toBeCloseTo(1831.4027777778, 6);
  });
});

describe('calculateCosts - robustness at the range limits', () => {
  const mileages = [1000, 15000, 100000];
  const ownerships = [1, 5, 10];
  const insurances: Assumptions['insurance'][] = [
    { mode: 'estimate', driverAgeBand: '18-24', coverage: 'oc_ac' },
    { mode: 'estimate', driverAgeBand: '75+', coverage: 'oc' },
    { mode: 'custom', annualPremiumPln: 0 },
    { mode: 'custom', annualPremiumPln: 100000 },
  ];
  const profiles: {
    valueRetention: ValueRetention;
    brandTier: BrandTier;
    segment: Segment;
    powerKw: number;
    listPricePln: number;
  }[] = [
    { valueRetention: 'high', brandTier: 'budget', segment: 'A', powerKw: 40, listPricePln: 100 },
    {
      valueRetention: 'average',
      brandTier: 'mainstream',
      segment: 'C',
      powerKw: 96,
      listPricePln: 100000,
    },
    {
      valueRetention: 'low',
      brandTier: 'premium',
      segment: 'F',
      powerKw: 600,
      listPricePln: 5000000,
    },
  ];

  it.each(FUEL_TYPES)(
    '%s: finite, non-negative numbers for every combination of assumptions at the limits',
    (fuelType) => {
      let combinations = 0;

      for (const profile of profiles) {
        const car = makeCarOfFuel(fuelType, profile);
        for (const annualMileageKm of mileages) {
          for (const ownershipYears of ownerships) {
            for (const insurance of insurances) {
              const assumptions: Assumptions = { annualMileageKm, ownershipYears, insurance };
              const label = `${fuelType} ${JSON.stringify({ profile, assumptions })}`;
              // Only inputs that pass assumptionsSchema are in scope.
              expect(assumptionsSchema.safeParse(assumptions).success, label).toBe(true);

              const costs = calculateCosts(car, makePrices(), assumptions);
              const numbers: [string, number][] = [
                ['purchasePricePln', costs.purchasePricePln],
                ['residualValuePln', costs.residualValuePln],
                ['residualValuePct', costs.residualValuePct],
                ['costPerKm', costs.costPerKm],
              ];
              for (const map of ['overOwnership', 'perYear', 'perMonth'] as const) {
                for (const key of COST_MAP_KEYS) numbers.push([`${map}.${key}`, costs[map][key]]);
              }

              // 4 scalar fields + 3 maps of 8 keys
              expect(numbers, label).toHaveLength(28);
              for (const [name, value] of numbers) {
                expect(Number.isFinite(value), `${name} = ${value} for ${label}`).toBe(true);
                expect(value, `${name} for ${label}`).toBeGreaterThanOrEqual(0);
              }
              expect(costs.residualValuePct, label).toBeGreaterThanOrEqual(10);
              expect(costs.residualValuePct, label).toBeLessThanOrEqual(95);
              expect(costs.overOwnership.total, label).toBeGreaterThan(0);
              combinations += 1;
            }
          }
        }
      }

      // 3 car profiles x 3 mileages x 3 ownership periods x 4 insurance variants
      expect(combinations).toBe(108);
    },
  );
});
