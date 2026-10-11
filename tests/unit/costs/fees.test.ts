import { describe, expect, it } from 'vitest';
import { feesOverOwnershipPln, inspectionCount } from '@/lib/costs';
import type { FuelType } from '@/lib/domain/types';
import { makeCar, makeCarOfFuel } from '../helpers/cars';

// Fees rule of the cost model. Registration 160 PLN once. Inspection 149 PLN (245 PLN for lpg),
// due at the end of ownership years 3, 5, 6, 7, 8, 9; counted when the due year < Y.

describe('inspectionCount', () => {
  it.each([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 1],
    [5, 1],
    [6, 2],
    [7, 3],
    [8, 4],
    [9, 5],
    [10, 6],
  ])('ownership of %i years has %i inspections', (years, expected) => {
    expect(inspectionCount(years)).toBe(expected);
  });
});

describe('feesOverOwnershipPln', () => {
  // 160 + n * 149
  it.each([
    [1, 160],
    [3, 160],
    [4, 309],
    [5, 309],
    [6, 458],
    [10, 1054],
  ])('petrol, %i years: %d PLN', (years, expected) => {
    expect(feesOverOwnershipPln(makeCar(), years)).toBe(expected);
  });

  // 160 + n * 245
  it.each([
    [1, 160],
    [3, 160],
    [4, 405],
    [5, 405],
    [6, 650],
    [10, 1630],
  ])('lpg uses the 245 PLN inspection fee, %i years: %d PLN', (years, expected) => {
    expect(feesOverOwnershipPln(makeCarOfFuel('lpg'), years)).toBe(expected);
  });

  const nonLpg: FuelType[] = ['petrol', 'diesel', 'hybrid', 'phev', 'ev'];

  it.each(nonLpg)('%s uses the 149 PLN inspection fee (10 years: 1054 PLN)', (fuelType) => {
    expect(feesOverOwnershipPln(makeCarOfFuel(fuelType), 10)).toBe(1054);
  });

  it('registration is added once, not per year', () => {
    // 10 years: total minus six inspections leaves a single registration fee
    expect(feesOverOwnershipPln(makeCar(), 10) - 6 * 149).toBe(160);
    expect(feesOverOwnershipPln(makeCar(), 1)).toBe(160);
    expect(feesOverOwnershipPln(makeCar(), 2)).toBe(160);
  });

  it('fees do not depend on the car price, tier or segment', () => {
    const car = makeCar({ listPricePln: 900000, brandTier: 'premium', segment: 'F' });
    expect(feesOverOwnershipPln(car, 5)).toBe(309);
  });
});
