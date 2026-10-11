import { COST_MODEL } from '@/config/cost-model';
import type { Car } from '@/lib/domain/types';

const MODEL = COST_MODEL.fees;

/** Periodic inspections that fall due before the end of ownership. */
export function inspectionCount(ownershipYears: number): number {
  return MODEL.inspectionDueYears.filter((dueYear) => dueYear < ownershipYears).length;
}

/** Registration of a new car (once) plus the periodic technical inspections. */
export function feesOverOwnershipPln(car: Car, ownershipYears: number): number {
  const inspectionPln = car.fuelType === 'lpg' ? MODEL.inspectionLpgPln : MODEL.inspectionPln;
  return MODEL.registrationPln + inspectionCount(ownershipYears) * inspectionPln;
}
