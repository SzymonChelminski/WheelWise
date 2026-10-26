import { describe, expect, it } from 'vitest';
import { calculateCosts, monthlyAffordabilityCost, requiredIncome, type CostBreakdown } from '@/lib/costs';
import { custom, estimate, makeAssumptions, makeCar, makeCarOfFuel, makePrices } from '../helpers/cars';

// Monthly amount behind the earnings scale: purchase price / (ownership years x 12) + monthly fuel or
// energy cost. Insurance, servicing, parts, fees and depreciation are not part of it.
//
// Monthly fuel of the test cars (15 000 km a year, petrol 6.50, electricity 1.27):
//   petrol 6.0 l/100 km             -> 5850 / 12   = 487.5
//   ev     17 kWh/100 km            -> 3238.5 / 12 = 269.875
//   phev   1.5 l + 16 kWh /100 km   -> 4510.5 / 12 = 375.875

const petrolCar = makeCarOfFuel('petrol', { listPricePln: 100000 });
const evCar = makeCarOfFuel('ev', { listPricePln: 200000 });
const phevCar = makeCarOfFuel('phev', { listPricePln: 150000 });

function costsFor(car = petrolCar, assumptions = makeAssumptions()): CostBreakdown {
  return calculateCosts(car, makePrices(), assumptions);
}

/** Reference petrol car over the default 5 years: 100 000 / 60 + 487.5. */
const REFERENCE_FIVE_YEARS = 2154.166667;

describe('monthlyAffordabilityCost - purchase spread over the ownership months plus fuel', () => {
  it.each([
    // fuel type, car, years, expected
    ['petrol', petrolCar, 1, 8820.833333], // 100 000 / 12 + 487.5
    ['petrol', petrolCar, 5, REFERENCE_FIVE_YEARS], // 100 000 / 60 + 487.5
    ['petrol', petrolCar, 10, 1320.833333], // 100 000 / 120 + 487.5
    ['ev', evCar, 1, 16936.541667], // 200 000 / 12 + 269.875
    ['ev', evCar, 5, 3603.208333], // 200 000 / 60 + 269.875
    ['ev', evCar, 10, 1936.541667], // 200 000 / 120 + 269.875
    ['phev', phevCar, 1, 12875.875], // 150 000 / 12 + 375.875
    ['phev', phevCar, 5, 2875.875], // 150 000 / 60 + 375.875
    ['phev', phevCar, 10, 1625.875], // 150 000 / 120 + 375.875
  ] as const)('%s car over %d year(s) of ownership', (_fuel, car, years, expected) => {
    const costs = costsFor(car, makeAssumptions({ ownershipYears: years }));
    expect(monthlyAffordabilityCost(costs, years)).toBeCloseTo(expected, 5);
  });

  it('is not rounded: the reference car gives 2154.1666..., not 2154 or 2200', () => {
    const value = monthlyAffordabilityCost(costsFor(), 5);
    expect(value).toBeCloseTo(REFERENCE_FIVE_YEARS, 5);
    expect(value).not.toBe(Math.round(value));
  });

  it('more ownership years lower the amount, and only the purchase part changes', () => {
    const one = monthlyAffordabilityCost(costsFor(), 1);
    const ten = monthlyAffordabilityCost(costsFor(), 10);
    // 100 000 / 12 - 100 000 / 120 = 7500
    expect(one - ten).toBeCloseTo(7500, 6);
  });

  it('a higher mileage raises the amount by the extra fuel only', () => {
    // 30 000 km: fuel 11 700 a year = 975 a month; 100 000 / 60 + 975
    const costs = costsFor(petrolCar, makeAssumptions({ annualMileageKm: 30000 }));
    expect(monthlyAffordabilityCost(costs, 5)).toBeCloseTo(2641.666667, 5);
  });

  it('spreads the price over the years it is given, whatever years the breakdown was computed for', () => {
    // Breakdown computed for 5 years, scale asked for 10: 100 000 / 120 + 487.5
    expect(monthlyAffordabilityCost(costsFor(), 10)).toBeCloseTo(1320.833333, 5);
  });

  it('accepts a fractional number of years (2.5 years = 30 months)', () => {
    // 100 000 / 30 + 487.5
    expect(monthlyAffordabilityCost(costsFor(), 2.5)).toBeCloseTo(3820.833333, 5);
  });

  it('a car with a price of 0 gives the monthly fuel cost alone', () => {
    const costs: CostBreakdown = { ...costsFor(), purchasePricePln: 0 };
    expect(monthlyAffordabilityCost(costs, 5)).toBeCloseTo(487.5, 6);
  });
});

describe('monthlyAffordabilityCost - ownership years that are not a positive finite number count as 5', () => {
  it.each([
    ['0', 0],
    ['-0', -0],
    ['-1', -1],
    ['-5', -5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
  ])('years = %s gives the 5-year amount', (_label, years) => {
    const value = monthlyAffordabilityCost(costsFor(), years);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeCloseTo(REFERENCE_FIVE_YEARS, 5);
  });

  it('an ev with years = 0 gives its 5-year amount (200 000 / 60 + 269.875)', () => {
    expect(monthlyAffordabilityCost(costsFor(evCar), 0)).toBeCloseTo(3603.208333, 5);
  });
});

describe('monthlyAffordabilityCost - insurance, servicing, parts, fees and depreciation are left out', () => {
  it('the insurance choice changes the total cost but not the amount', () => {
    const variants = [
      estimate('35-44', 'oc_ac'),
      estimate('18-24', 'oc_ac'),
      estimate('35-44', 'oc'),
      custom(0),
      custom(20000),
    ].map((assumptions) => costsFor(petrolCar, assumptions));

    // Precondition: the insurance variants really give different totals.
    const totals = new Set(variants.map((costs) => Math.round(costs.perMonth.total)));
    expect(totals.size).toBe(variants.length);

    for (const costs of variants) {
      expect(monthlyAffordabilityCost(costs, 5)).toBeCloseTo(REFERENCE_FIVE_YEARS, 5);
    }
  });

  it('raising every other cost of the breakdown leaves the amount unchanged', () => {
    const base = costsFor();
    const inflate = (map: CostBreakdown['perMonth']) => ({
      ...map,
      depreciation: map.depreciation + 10000,
      insurance: map.insurance + 10000,
      service: map.service + 10000,
      parts: map.parts + 10000,
      fees: map.fees + 10000,
      maintenance: map.maintenance + 30000,
      total: map.total + 50000,
    });
    const inflated: CostBreakdown = {
      ...base,
      residualValuePln: 0,
      residualValuePct: 0,
      costPerKm: base.costPerKm * 10,
      perMonth: inflate(base.perMonth),
      perYear: inflate(base.perYear),
      overOwnership: inflate(base.overOwnership),
    };
    expect(monthlyAffordabilityCost(inflated, 5)).toBeCloseTo(REFERENCE_FIVE_YEARS, 5);
  });

  it('reads the monthly fuel cost, not the yearly or whole-ownership one', () => {
    const base = costsFor();
    const costs: CostBreakdown = {
      ...base,
      perMonth: { ...base.perMonth, fuel: 100 },
      perYear: { ...base.perYear, fuel: 99999 },
      overOwnership: { ...base.overOwnership, fuel: 999999 },
    };
    // 100 000 / 60 + 100
    expect(monthlyAffordabilityCost(costs, 5)).toBeCloseTo(1766.666667, 5);
  });

  it('is not the total monthly cost: the reference car gives 2154.17, its total is 1713.40', () => {
    const costs = calculateCosts(makeCar(), makePrices(), makeAssumptions());
    expect(costs.perMonth.total).toBeCloseTo(1713.4, 2);
    expect(monthlyAffordabilityCost(costs, 5)).toBeCloseTo(REFERENCE_FIVE_YEARS, 5);
  });
});

describe('monthlyAffordabilityCost feeds requiredIncome', () => {
  it('the reference car needs 14 400 zł for comfortable, 10 800 for reasonable and 8600 for stretch', () => {
    // 2154.1667 / 0.15 = 14361.1 -> 14400; / 0.20 = 10770.8 -> 10800; / 0.25 = 8616.7 -> 8600
    expect(requiredIncome(monthlyAffordabilityCost(costsFor(), 5))).toEqual([
      { level: 'comfortable', minIncomePln: 14400, maxIncomePln: null },
      { level: 'reasonable', minIncomePln: 10800, maxIncomePln: 14400 },
      { level: 'stretch', minIncomePln: 8600, maxIncomePln: 10800 },
      { level: 'not_recommended', minIncomePln: null, maxIncomePln: 8600 },
    ]);
  });
});
