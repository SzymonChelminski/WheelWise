import { describe, expect, it } from 'vitest';
import {
  depreciationOverOwnershipPln,
  residualPctAfter,
  residualValuePln,
} from '@/lib/costs';
import type { FuelType, ValueRetention } from '@/lib/domain/types';
import { makeCar, makeCarOfFuel } from '../helpers/cars';

// Depreciation rule of the cost model. Base residuals after year 1..10 at 15 000 km:
// 82, 73, 65, 58, 52, 47, 42, 38, 34, 31. At 3 years baseLoss = 35.

describe('residualPctAfter - base table', () => {
  it.each([
    [1, 82],
    [2, 73],
    [3, 65],
    [4, 58],
    [5, 52],
    [6, 47],
    [7, 42],
    [8, 38],
    [9, 34],
    [10, 31],
  ])(
    'petrol, average retention, 15 000 km: residual after %i years is %d percent',
    (years, expected) => {
      expect(residualPctAfter(makeCar(), years, 15000)).toBeCloseTo(expected, 9);
    },
  );
});

describe('residualPctAfter - fuel factor', () => {
  // 100 - 35 * factor
  const cases: [FuelType, number][] = [
    ['petrol', 65], // 1.00
    ['diesel', 63.25], // 1.05
    ['lpg', 65], // 1.00
    ['hybrid', 67.8], // 0.92
    ['phev', 60.8], // 1.12
    ['ev', 52.75], // 1.35
  ];

  it.each(cases)('fuel factor of %s gives %d percent after 3 years', (fuelType, expected) => {
    const car = makeCarOfFuel(fuelType, { valueRetention: 'average' });
    expect(residualPctAfter(car, 3, 15000)).toBeCloseTo(expected, 9);
  });
});

describe('residualPctAfter - retention factor', () => {
  // 100 - 35 * factor
  const cases: [ValueRetention, number][] = [
    ['high', 68.5], // 0.90
    ['average', 65], // 1.00
    ['low', 60.8], // 1.12
  ];

  it.each(cases)('retention %s gives %d percent after 3 years', (valueRetention, expected) => {
    expect(residualPctAfter(makeCar({ valueRetention }), 3, 15000)).toBeCloseTo(expected, 9);
  });

  it('fuel factor and retention factor multiply (diesel, low retention, 3 years)', () => {
    // 35 * 1.05 * 1.12 = 41.16 -> 58.84
    const car = makeCarOfFuel('diesel', { valueRetention: 'low' });
    expect(residualPctAfter(car, 3, 15000)).toBeCloseTo(58.84, 9);
  });
});

describe('residualPctAfter - mileage adjustment', () => {
  it('25 000 km for 5 years adds 10 points of loss (52 -> 42)', () => {
    // (25000 - 15000) / 1000 * 0.2 * 5 = 10
    expect(residualPctAfter(makeCar(), 5, 25000)).toBeCloseTo(42, 9);
  });

  it('5 000 km for 5 years removes 10 points of loss (52 -> 62)', () => {
    // (5000 - 15000) / 1000 * 0.2 * 5 = -10
    expect(residualPctAfter(makeCar(), 5, 5000)).toBeCloseTo(62, 9);
  });

  it('the adjustment scales with the number of years (30 000 km, 1 year: 82 -> 79)', () => {
    // 15 * 0.2 * 1 = 3
    expect(residualPctAfter(makeCar(), 1, 30000)).toBeCloseTo(79, 9);
  });

  it('the adjustment is added after the factors, not multiplied by them', () => {
    // ev, low retention, 2 years, 20 000 km: 27 * 1.35 * 1.12 = 40.824; + 5 * 0.2 * 2 = 2 -> 57.176
    const car = makeCarOfFuel('ev', { valueRetention: 'low' });
    expect(residualPctAfter(car, 2, 20000)).toBeCloseTo(57.176, 9);
  });

  it('exactly 15 000 km gives no adjustment', () => {
    expect(residualPctAfter(makeCar(), 7, 15000)).toBeCloseTo(42, 9);
  });
});

describe('residualPctAfter - clamps', () => {
  it('clamps at 10% for 10 years and 100 000 km', () => {
    // loss = 69 + 85 * 0.2 * 10 = 239 -> clamp
    expect(residualPctAfter(makeCar(), 10, 100000)).toBe(10);
  });

  it('a loss of 89 points is not clamped (residual 11%)', () => {
    // 10 years, 25 000 km: 69 + 10 * 0.2 * 10 = 89
    expect(residualPctAfter(makeCar(), 10, 25000)).toBeCloseTo(11, 9);
  });

  it('a loss of 91 points is clamped to 10%', () => {
    // 10 years, 26 000 km: 69 + 11 * 0.2 * 10 = 91
    expect(residualPctAfter(makeCar(), 10, 26000)).toBe(10);
  });

  it('clamps at 95% when the computed loss is below 5 points', () => {
    // The upper clamp cannot be reached with mileage >= 0 (highest valid value: 87.896, below).
    // A mileage outside the valid range is passed directly to reach it:
    // 1 year, -100 000 km: 18 + (-115) * 0.2 = -5 -> 105 -> clamp 95
    expect(residualPctAfter(makeCar(), 1, -100000)).toBe(95);
  });

  it('the highest residual reachable with valid input is not clamped (87.896%)', () => {
    // hybrid, high retention, 1 year, 1 000 km: 18 * 0.92 * 0.9 = 14.904; -14 * 0.2 = -2.8 -> 12.104
    const car = makeCarOfFuel('hybrid', { valueRetention: 'high' });
    expect(residualPctAfter(car, 1, 1000)).toBeCloseTo(87.896, 9);
  });
});

describe('residualPctAfter - year 0', () => {
  it.each([1000, 15000, 100000])('residualPctAfter(car, 0, %i) is 100', (km) => {
    expect(residualPctAfter(makeCar(), 0, km)).toBe(100);
  });

  it('year 0 is 100 for every fuel type and retention, also the least favourable', () => {
    const car = makeCarOfFuel('ev', { valueRetention: 'low' });
    expect(residualPctAfter(car, 0, 100000)).toBe(100);
  });
});

describe('residual value and depreciation in PLN', () => {
  it('residualValuePln is the list price times the residual percentage', () => {
    // diesel, 3 years: 63.25% of 200 000
    const car = makeCarOfFuel('diesel', { listPricePln: 200000 });
    expect(residualValuePln(car, 3, 15000)).toBeCloseTo(126500, 6);
  });

  it('depreciation over ownership is the list price minus the residual value', () => {
    const car = makeCarOfFuel('diesel', { listPricePln: 200000 });
    expect(depreciationOverOwnershipPln(car, 3, 15000)).toBeCloseTo(73500, 6);
  });

  it('a clamped residual of 10% leaves 90% of the price as depreciation', () => {
    const car = makeCar({ listPricePln: 80000 });
    expect(residualValuePln(car, 10, 100000)).toBeCloseTo(8000, 6);
    expect(depreciationOverOwnershipPln(car, 10, 100000)).toBeCloseTo(72000, 6);
  });
});
