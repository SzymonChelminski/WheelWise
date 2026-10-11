import { describe, expect, it } from 'vitest';
import { annualFuelCostPln } from '@/lib/costs';
import { makeCarOfFuel, makePrices } from '../helpers/cars';

// Fuel and energy rule of the cost model.
// Yearly cost = K / 100 * (fuelL100 * fuelPrice + electricKwh100 * electricityPrice).
// Prices used: petrol 6.50, diesel 6.60, lpg 3.10, electricity 1.27 (all different on purpose).

describe('annualFuelCostPln - price key per fuel type', () => {
  it('petrol uses the petrol price', () => {
    // 150 * 6.0 * 6.50
    expect(annualFuelCostPln(makeCarOfFuel('petrol'), makePrices(), 15000)).toBeCloseTo(5850, 6);
  });

  it('diesel uses the diesel price', () => {
    // 150 * 5.0 * 6.60
    expect(annualFuelCostPln(makeCarOfFuel('diesel'), makePrices(), 15000)).toBeCloseTo(4950, 6);
  });

  it('lpg uses the LPG price', () => {
    // 150 * 8.0 * 3.10
    expect(annualFuelCostPln(makeCarOfFuel('lpg'), makePrices(), 15000)).toBeCloseTo(3720, 6);
  });

  it('hybrid uses the petrol price', () => {
    // 150 * 4.5 * 6.50
    expect(annualFuelCostPln(makeCarOfFuel('hybrid'), makePrices(), 15000)).toBeCloseTo(4387.5, 6);
  });

  it('phev sums petrol and electricity', () => {
    // 150 * (1.5 * 6.50 + 16 * 1.27) = 150 * 30.07
    expect(annualFuelCostPln(makeCarOfFuel('phev'), makePrices(), 15000)).toBeCloseTo(4510.5, 6);
  });

  it('ev uses electricity only', () => {
    // 150 * 17 * 1.27
    expect(annualFuelCostPln(makeCarOfFuel('ev'), makePrices(), 15000)).toBeCloseTo(3238.5, 6);
  });
});

describe('annualFuelCostPln - independence from the other prices', () => {
  it('a petrol car ignores the diesel, LPG and electricity prices', () => {
    const prices = makePrices({ diesel: 99, lpg: 99, electricity: 99 });
    expect(annualFuelCostPln(makeCarOfFuel('petrol'), prices, 15000)).toBeCloseTo(5850, 6);
  });

  it('a diesel car ignores the petrol, LPG and electricity prices', () => {
    const prices = makePrices({ petrol: 99, lpg: 99, electricity: 99 });
    expect(annualFuelCostPln(makeCarOfFuel('diesel'), prices, 15000)).toBeCloseTo(4950, 6);
  });

  it('an lpg car ignores the petrol, diesel and electricity prices', () => {
    const prices = makePrices({ petrol: 99, diesel: 99, electricity: 99 });
    expect(annualFuelCostPln(makeCarOfFuel('lpg'), prices, 15000)).toBeCloseTo(3720, 6);
  });

  it('an ev ignores the petrol, diesel and LPG prices', () => {
    const prices = makePrices({ petrol: 99, diesel: 99, lpg: 99 });
    expect(annualFuelCostPln(makeCarOfFuel('ev'), prices, 15000)).toBeCloseTo(3238.5, 6);
  });

  it('a phev ignores the diesel and LPG prices', () => {
    const prices = makePrices({ diesel: 99, lpg: 99 });
    expect(annualFuelCostPln(makeCarOfFuel('phev'), prices, 15000)).toBeCloseTo(4510.5, 6);
  });

  it('a phev reacts to the petrol price and to the electricity price separately', () => {
    const car = makeCarOfFuel('phev');
    // 150 * (1.5 * 8.00 + 16 * 1.27) = 150 * 32.32
    expect(annualFuelCostPln(car, makePrices({ petrol: 8 }), 15000)).toBeCloseTo(4848, 6);
    // 150 * (1.5 * 6.50 + 16 * 2.00) = 150 * 41.75
    expect(annualFuelCostPln(car, makePrices({ electricity: 2 }), 15000)).toBeCloseTo(6262.5, 6);
  });
});

describe('annualFuelCostPln - mileage', () => {
  it('the cost is proportional to the mileage', () => {
    const car = makeCarOfFuel('petrol');
    expect(annualFuelCostPln(car, makePrices(), 1000)).toBeCloseTo(390, 6);
    expect(annualFuelCostPln(car, makePrices(), 30000)).toBeCloseTo(11700, 6);
    expect(annualFuelCostPln(car, makePrices(), 100000)).toBeCloseTo(39000, 6);
  });
});
