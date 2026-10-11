import { describe, expect, it } from 'vitest';
import { annualPartsCostPln, annualServiceCostPln } from '@/lib/costs';
import type { BrandTier, FuelType, Segment } from '@/lib/domain/types';
import { makeCar, makeCarOfFuel } from '../helpers/cars';

// Servicing rule and parts and wear rule of the cost model.

describe('annualServiceCostPln - brand tier', () => {
  const cases: [BrandTier, number][] = [
    ['budget', 900],
    ['mainstream', 1200],
    ['premium', 2200],
  ];

  it.each(cases)('tier %s costs %d PLN per year at 15 000 km', (brandTier, expected) => {
    expect(annualServiceCostPln(makeCar({ brandTier }), 15000)).toBeCloseTo(expected, 6);
  });
});

describe('annualServiceCostPln - EV factor', () => {
  const cases: [BrandTier, number][] = [
    ['budget', 540], // 900 * 0.60
    ['mainstream', 720], // 1200 * 0.60
    ['premium', 1320], // 2200 * 0.60
  ];

  it.each(cases)('ev of tier %s costs %d PLN per year', (brandTier, expected) => {
    expect(annualServiceCostPln(makeCarOfFuel('ev', { brandTier }), 15000)).toBeCloseTo(
      expected,
      6,
    );
  });

  const others: FuelType[] = ['petrol', 'diesel', 'lpg', 'hybrid', 'phev'];

  it.each(others)('%s has a fuel factor of 1.00 (mainstream: 1200 PLN)', (fuelType) => {
    expect(annualServiceCostPln(makeCarOfFuel(fuelType), 15000)).toBeCloseTo(1200, 6);
  });
});

describe('annualServiceCostPln - mileage scaling', () => {
  it.each([1000, 10000, 19999, 20000])(
    'at %i km (not above 20 000) the base is not scaled',
    (km) => {
      expect(annualServiceCostPln(makeCar(), km)).toBeCloseTo(1200, 6);
    },
  );

  it.each([
    [20001, 1200.06],
    [30000, 1800],
    [40000, 2400],
    [100000, 6000],
  ])('at %i km (above 20 000) the cost is %d PLN', (km, expected) => {
    expect(annualServiceCostPln(makeCar(), km)).toBeCloseTo(expected, 6);
  });

  it('tier, EV factor and mileage scaling multiply (premium ev, 40 000 km)', () => {
    // 2200 * 0.60 * 2
    const car = makeCarOfFuel('ev', { brandTier: 'premium' });
    expect(annualServiceCostPln(car, 40000)).toBeCloseTo(2640, 6);
  });
});

describe('annualPartsCostPln - segment', () => {
  // 15000 * rate
  const cases: [Segment, number][] = [
    ['A', 900], // 0.06
    ['B', 1050], // 0.07
    ['C', 1350], // 0.09
    ['D', 1800], // 0.12
    ['E', 2400], // 0.16
    ['F', 3300], // 0.22
  ];

  it.each(cases)('segment %s, mainstream, 15 000 km: %d PLN per year', (segment, expected) => {
    expect(annualPartsCostPln(makeCar({ segment }), 15000)).toBeCloseTo(expected, 6);
  });
});

describe('annualPartsCostPln - tier factor', () => {
  const cases: [BrandTier, number][] = [
    ['budget', 1215], // 1350 * 0.90
    ['mainstream', 1350],
    ['premium', 1890], // 1350 * 1.40
  ];

  it.each(cases)('segment C, tier %s: %d PLN per year', (brandTier, expected) => {
    expect(annualPartsCostPln(makeCar({ brandTier }), 15000)).toBeCloseTo(expected, 6);
  });
});

describe('annualPartsCostPln - EV factor', () => {
  it('ev, segment C, mainstream: 1350 * 0.90', () => {
    expect(annualPartsCostPln(makeCarOfFuel('ev'), 15000)).toBeCloseTo(1215, 6);
  });

  it('segment, tier and EV factor multiply (ev, segment D, premium)', () => {
    // 15000 * 0.12 * 1.40 * 0.90
    const car = makeCarOfFuel('ev', { segment: 'D', brandTier: 'premium' });
    expect(annualPartsCostPln(car, 15000)).toBeCloseTo(2268, 6);
  });

  const others: FuelType[] = ['petrol', 'diesel', 'lpg', 'hybrid', 'phev'];

  it.each(others)('%s has a fuel factor of 1.00 (segment C: 1350 PLN)', (fuelType) => {
    expect(annualPartsCostPln(makeCarOfFuel(fuelType), 15000)).toBeCloseTo(1350, 6);
  });
});

describe('annualPartsCostPln - mileage', () => {
  it.each([
    [1000, 90],
    [10000, 900],
    [30000, 2700],
    [100000, 9000],
  ])('is proportional to the mileage: %i km -> %d PLN', (km, expected) => {
    expect(annualPartsCostPln(makeCar(), km)).toBeCloseTo(expected, 6);
  });
});
