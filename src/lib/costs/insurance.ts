import { COST_MODEL } from '@/config/cost-model';
import type { Assumptions, Car } from '@/lib/domain/types';
import { residualPctAfter } from './depreciation';

const MODEL = COST_MODEL.insurance;

function powerFactor(powerKw: number): number {
  const tier = MODEL.powerFactorTiers.find(({ maxKw }) => powerKw <= maxKw);
  return tier ? tier.factor : MODEL.powerFactorAbove;
}

/** Insurance cost of each ownership year, index 0 = year 1. */
export function insuranceCostsByYearPln(car: Car, a: Assumptions): number[] {
  const years = Array.from({ length: a.ownershipYears }, (_, i) => i + 1);
  const { insurance } = a;

  if (insurance.mode === 'custom') {
    return years.map(() => insurance.annualPremiumPln);
  }

  const oc = MODEL.ocByAgePln[insurance.driverAgeBand] * powerFactor(car.powerKw);
  if (insurance.coverage === 'oc') return years.map(() => oc);

  return years.map((year) => {
    const currentValue =
      (car.listPricePln * residualPctAfter(car, year - 1, a.annualMileageKm)) / 100;
    return oc + currentValue * MODEL.acRateOfCurrentValue * MODEL.acAgeFactor[insurance.driverAgeBand];
  });
}

export function insuranceOverOwnershipPln(car: Car, a: Assumptions): number {
  return insuranceCostsByYearPln(car, a).reduce((sum, yearly) => sum + yearly, 0);
}
