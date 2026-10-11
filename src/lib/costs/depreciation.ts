import { COST_MODEL } from '@/config/cost-model';
import type { Car } from '@/lib/domain/types';

const MODEL = COST_MODEL.depreciation;
const MAX_YEARS = MODEL.baseResidualPct.length;

/**
 * Residual value of the car as a percentage of its list price after `years`
 * of ownership (0..10). Year 0 is the list price itself.
 */
export function residualPctAfter(car: Car, years: number, annualMileageKm: number): number {
  if (!Number.isInteger(years) || years < 0 || years > MAX_YEARS) {
    throw new RangeError(`years must be an integer from 0 to ${MAX_YEARS}, got ${years}`);
  }
  if (years === 0) return 100;

  const baseLoss = 100 - MODEL.baseResidualPct[years - 1];
  const mileageAdjustment =
    ((annualMileageKm - MODEL.referenceMileageKm) / 1000) *
    MODEL.mileagePointsPer1000KmPerYear *
    years;
  const loss =
    baseLoss * MODEL.fuelFactor[car.fuelType] * MODEL.retentionFactor[car.valueRetention] +
    mileageAdjustment;

  return Math.min(MODEL.maxResidualPct, Math.max(MODEL.minResidualPct, 100 - loss));
}

export function residualValuePln(car: Car, years: number, annualMileageKm: number): number {
  return (car.listPricePln * residualPctAfter(car, years, annualMileageKm)) / 100;
}

export function depreciationOverOwnershipPln(
  car: Car,
  years: number,
  annualMileageKm: number,
): number {
  return car.listPricePln - residualValuePln(car, years, annualMileageKm);
}
