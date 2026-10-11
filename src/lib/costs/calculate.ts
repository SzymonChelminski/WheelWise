import type { Assumptions, Car, MarketPrices } from '@/lib/domain/types';
import { depreciationOverOwnershipPln, residualPctAfter, residualValuePln } from './depreciation';
import { feesOverOwnershipPln } from './fees';
import { annualFuelCostPln } from './fuel';
import { insuranceOverOwnershipPln } from './insurance';
import { annualPartsCostPln, annualServiceCostPln } from './maintenance';

export type CostKey = 'depreciation' | 'fuel' | 'insurance' | 'service' | 'parts' | 'fees';
export type CostMap = Record<CostKey, number> & { total: number; maintenance: number }; // maintenance = service + parts + fees

export interface CostBreakdown {
  purchasePricePln: number;
  residualValuePln: number;
  residualValuePct: number;
  overOwnership: CostMap;
  perYear: CostMap;
  perMonth: CostMap;
  costPerKm: number;
}

function toCostMap(parts: Record<CostKey, number>): CostMap {
  return {
    ...parts,
    total:
      parts.depreciation + parts.fuel + parts.insurance + parts.service + parts.parts + parts.fees,
    maintenance: parts.service + parts.parts + parts.fees,
  };
}

function divideCostMap(map: CostMap, divisor: number): CostMap {
  return {
    depreciation: map.depreciation / divisor,
    fuel: map.fuel / divisor,
    insurance: map.insurance / divisor,
    service: map.service / divisor,
    parts: map.parts / divisor,
    fees: map.fees / divisor,
    total: map.total / divisor,
    maintenance: map.maintenance / divisor,
  };
}

/** Costs of owning the car for the whole period, per year and per month. Values are not rounded. */
export function calculateCosts(car: Car, prices: MarketPrices, a: Assumptions): CostBreakdown {
  const years = a.ownershipYears;
  const km = a.annualMileageKm;

  const overOwnership = toCostMap({
    depreciation: depreciationOverOwnershipPln(car, years, km),
    fuel: annualFuelCostPln(car, prices, km) * years,
    insurance: insuranceOverOwnershipPln(car, a),
    service: annualServiceCostPln(car, km) * years,
    parts: annualPartsCostPln(car, km) * years,
    fees: feesOverOwnershipPln(car, years),
  });

  return {
    purchasePricePln: car.listPricePln,
    residualValuePln: residualValuePln(car, years, km),
    residualValuePct: residualPctAfter(car, years, km),
    overOwnership,
    perYear: divideCostMap(overOwnership, years),
    perMonth: divideCostMap(overOwnership, years * 12),
    costPerKm: overOwnership.total / (km * years),
  };
}
