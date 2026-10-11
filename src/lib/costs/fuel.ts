import { COST_MODEL } from '@/config/cost-model';
import type { Car, MarketPrices } from '@/lib/domain/types';

const MODEL = COST_MODEL.fuel;

/** Yearly cost of fuel and electricity. A missing consumption value counts as 0. */
export function annualFuelCostPln(
  car: Car,
  prices: MarketPrices,
  annualMileageKm: number,
): number {
  const fuelPrice = prices[MODEL.priceKeyByFuelType[car.fuelType]].pricePln;
  const electricityPrice = prices[MODEL.electricityKey].pricePln;
  const per100Km =
    (car.fuelL100 ?? 0) * fuelPrice + (car.electricKwh100 ?? 0) * electricityPrice;

  return (annualMileageKm / 100) * per100Km;
}
