import { describe, expect, it } from 'vitest';
import { insuranceCostsByYearPln, insuranceOverOwnershipPln } from '@/lib/costs';
import type { DriverAgeBand } from '@/lib/domain/types';
import { custom, estimate, makeCar, makeCarOfFuel } from '../helpers/cars';

// Insurance rule of the cost model. Reference car: P = 100 000, 96 kW (power factor 1.00).

function expectYears(actual: number[], expected: number[]) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => {
    expect(actual[index], `ownership year ${index + 1}`).toBeCloseTo(value, 6);
  });
}

describe('OC by driver age band', () => {
  const cases: [DriverAgeBand, number][] = [
    ['18-24', 1866],
    ['25-34', 763],
    ['35-44', 609],
    ['45-54', 594],
    ['55-59', 563],
    ['60-64', 550],
    ['65-69', 581],
    ['70-74', 672],
    ['75+', 779],
  ];

  it.each(cases)('OC for age band %s at 96 kW is %d PLN', (band, expected) => {
    expectYears(insuranceCostsByYearPln(makeCar(), estimate(band, 'oc', { ownershipYears: 1 })), [
      expected,
    ]);
  });
});

describe('OC power factor boundaries', () => {
  // OC 609 (35-44) times 0.90 / 1.00 / 1.10 / 1.25
  const cases: [number, number][] = [
    [74, 548.1],
    [75, 609],
    [110, 609],
    [111, 669.9],
    [150, 669.9],
    [151, 761.25],
  ];

  it.each(cases)('%i kW gives an OC of %d PLN for age band 35-44', (powerKw, expected) => {
    const car = makeCar({ powerKw });
    expectYears(insuranceCostsByYearPln(car, estimate('35-44', 'oc', { ownershipYears: 1 })), [
      expected,
    ]);
  });

  it('the power factor multiplies the OC of the selected age band (18-24, 151 kW)', () => {
    // 1866 * 1.25
    const car = makeCar({ powerKw: 151 });
    expectYears(insuranceCostsByYearPln(car, estimate('18-24', 'oc', { ownershipYears: 1 })), [
      2332.5,
    ]);
  });

  it('very low and very high power use the outer factors (1 kW, 1000 kW)', () => {
    const a = estimate('35-44', 'oc', { ownershipYears: 1 });
    expectYears(insuranceCostsByYearPln(makeCar({ powerKw: 1 }), a), [548.1]);
    expectYears(insuranceCostsByYearPln(makeCar({ powerKw: 1000 }), a), [761.25]);
  });
});

describe('coverage oc', () => {
  it('coverage oc has no AC part: every year equals OC, whatever the car price', () => {
    const car = makeCar({ listPricePln: 900000 });
    expectYears(insuranceCostsByYearPln(car, estimate('35-44', 'oc')), [609, 609, 609, 609, 609]);
  });

  it('coverage oc over 5 years is 5 x OC', () => {
    expect(insuranceOverOwnershipPln(makeCar(), estimate('35-44', 'oc'))).toBeCloseTo(3045, 6);
  });

  it('coverage oc for 18-24 has no AC age factor applied (10 years, 151 kW)', () => {
    // 10 * 1866 * 1.25
    const car = makeCar({ powerKw: 151 });
    const a = estimate('18-24', 'oc', { ownershipYears: 10 });
    expect(insuranceOverOwnershipPln(car, a)).toBeCloseTo(23325, 6);
  });
});

describe('coverage oc_ac', () => {
  it('AC follows the residual value at the start of each year (reference case)', () => {
    // 609 + 100000 * 0.025 * [1, 0.82, 0.73, 0.65, 0.58]
    expectYears(insuranceCostsByYearPln(makeCar(), estimate('35-44', 'oc_ac')), [
      3109, 2659, 2434, 2234, 2059,
    ]);
  });

  it('the yearly cost declines strictly from year to year', () => {
    const a = estimate('35-44', 'oc_ac', { ownershipYears: 10 });
    const years = insuranceCostsByYearPln(makeCar(), a);
    expect(years).toHaveLength(10);
    for (let i = 1; i < years.length; i += 1) {
      expect(years[i], `year ${i + 1} against year ${i}`).toBeLessThan(years[i - 1]);
    }
  });

  it('the sum over 10 years uses residuals of years 0..9', () => {
    // 10 * 609 + 2500 * (1 + .82 + .73 + .65 + .58 + .52 + .47 + .42 + .38 + .34) = 6090 + 2500 * 5.91
    const a = estimate('35-44', 'oc_ac', { ownershipYears: 10 });
    expect(insuranceOverOwnershipPln(makeCar(), a)).toBeCloseTo(20865, 6);
  });

  it('AC is proportional to the list price', () => {
    // 609 + 250000 * 0.025 * [1, 0.82]
    const car = makeCar({ listPricePln: 250000 });
    const a = estimate('35-44', 'oc_ac', { ownershipYears: 2 });
    expectYears(insuranceCostsByYearPln(car, a), [6859, 5734]);
  });

  it('AC uses the mileage-adjusted residual value (25 000 km, year 2)', () => {
    // residual after year 1 = 100 - (18 + 10 * 0.2) = 80 -> AC 2000
    const a = estimate('35-44', 'oc_ac', { ownershipYears: 2, annualMileageKm: 25000 });
    expectYears(insuranceCostsByYearPln(makeCar(), a), [3109, 2609]);
  });

  it('AC uses the fuel factor of the residual value (ev, year 2)', () => {
    // residual after year 1 = 100 - 18 * 1.35 = 75.7 -> AC 1892.5
    const a = estimate('35-44', 'oc_ac', { ownershipYears: 2 });
    expectYears(insuranceCostsByYearPln(makeCarOfFuel('ev'), a), [3109, 2501.5]);
  });

  it('the power factor applies to OC only, not to AC (151 kW, year 1)', () => {
    // 609 * 1.25 + 2500
    const a = estimate('35-44', 'oc_ac', { ownershipYears: 1 });
    expectYears(insuranceCostsByYearPln(makeCar({ powerKw: 151 }), a), [3261.25]);
  });
});

describe('AC age factor', () => {
  // Year 1: OC + 100000 * 0.025 * factor
  const cases: [DriverAgeBand, number][] = [
    ['18-24', 6866], // 1866 + 2500 * 2.00
    ['25-34', 3888], // 763 + 2500 * 1.25
    ['35-44', 3109], // 609 + 2500
    ['45-54', 3094], // 594 + 2500
    ['55-59', 3063], // 563 + 2500
    ['60-64', 3050], // 550 + 2500
    ['65-69', 3081], // 581 + 2500
    ['70-74', 3422], // 672 + 2500 * 1.10
    ['75+', 3529], // 779 + 2500 * 1.10
  ];

  it.each(cases)('age band %s: OC + AC in year 1 is %d PLN', (band, expected) => {
    const a = estimate(band, 'oc_ac', { ownershipYears: 1 });
    expectYears(insuranceCostsByYearPln(makeCar(), a), [expected]);
  });

  it('the age factor applies in every year (18-24, 3 years)', () => {
    // 1866 + 5000 * [1, 0.82, 0.73]
    const a = estimate('18-24', 'oc_ac', { ownershipYears: 3 });
    expectYears(insuranceCostsByYearPln(makeCar(), a), [6866, 5966, 5516]);
  });
});

describe('custom premium', () => {
  it('every year costs exactly the entered premium', () => {
    expect(insuranceCostsByYearPln(makeCar(), custom(1234.5))).toEqual([
      1234.5, 1234.5, 1234.5, 1234.5, 1234.5,
    ]);
  });

  it('a premium of 0 gives 0 in every year', () => {
    expect(insuranceCostsByYearPln(makeCar(), custom(0))).toEqual([0, 0, 0, 0, 0]);
    expect(insuranceOverOwnershipPln(makeCar(), custom(0))).toBe(0);
  });

  it('the number of years follows the ownership period (1 and 10 years)', () => {
    expect(insuranceCostsByYearPln(makeCar(), custom(800, { ownershipYears: 1 }))).toEqual([800]);
    expect(insuranceCostsByYearPln(makeCar(), custom(800, { ownershipYears: 10 }))).toEqual(
      Array.from({ length: 10 }, () => 800),
    );
  });

  it('the sum over ownership is premium x years', () => {
    expect(insuranceOverOwnershipPln(makeCar(), custom(1234.5, { ownershipYears: 3 }))).toBeCloseTo(
      3703.5,
      6,
    );
    expect(insuranceOverOwnershipPln(makeCar(), custom(100000, { ownershipYears: 10 }))).toBe(
      1000000,
    );
  });

  it('the custom premium ignores the car (price, power) and the mileage', () => {
    const car = makeCar({ listPricePln: 900000, powerKw: 400 });
    const a = custom(1500, { ownershipYears: 2, annualMileageKm: 100000 });
    expect(insuranceCostsByYearPln(car, a)).toEqual([1500, 1500]);
  });
});
