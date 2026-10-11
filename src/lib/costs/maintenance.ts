import { COST_MODEL } from '@/config/cost-model';
import type { Car } from '@/lib/domain/types';

/** Yearly cost of scheduled servicing. */
export function annualServiceCostPln(car: Car, annualMileageKm: number): number {
  const model = COST_MODEL.service;
  const fuelFactor = car.fuelType === 'ev' ? model.evFactor : model.otherFuelFactor;
  const mileageFactor = Math.max(1, annualMileageKm / model.referenceMileageKm);

  return model.yearlyBasePln[car.brandTier] * fuelFactor * mileageFactor;
}

/** Yearly cost of parts and wear (tyres, brakes, consumables). */
export function annualPartsCostPln(car: Car, annualMileageKm: number): number {
  const model = COST_MODEL.parts;
  const fuelFactor = car.fuelType === 'ev' ? model.evFactor : model.otherFuelFactor;

  return annualMileageKm * model.ratePlnPerKm[car.segment] * model.tierFactor[car.brandTier] * fuelFactor;
}
