import { COST_MODEL } from '@/config/cost-model';

export type AffordabilityLevel = 'comfortable' | 'reasonable' | 'stretch' | 'not_recommended';

/** Net monthly income range, rounded to the rounding step of the cost model. */
export interface IncomeRange {
  level: AffordabilityLevel;
  minIncomePln: number | null;
  maxIncomePln: number | null;
}

const MODEL = COST_MODEL.income;

function roundToStep(valuePln: number): number {
  return Math.round(valuePln / MODEL.roundingStepPln) * MODEL.roundingStepPln;
}

/**
 * Net monthly income at which the monthly total cost stays within each share
 * of income. A cost that is not a positive finite number gives all zero bounds.
 */
export function requiredIncome(monthlyTotalCostPln: number): IncomeRange[] {
  const cost =
    Number.isFinite(monthlyTotalCostPln) && monthlyTotalCostPln > 0 ? monthlyTotalCostPln : 0;
  const comfortableMin = roundToStep(cost / MODEL.shareComfortable);
  const reasonableMin = roundToStep(cost / MODEL.shareReasonable);
  const stretchMin = roundToStep(cost / MODEL.shareStretch);

  return [
    { level: 'comfortable', minIncomePln: comfortableMin, maxIncomePln: null },
    { level: 'reasonable', minIncomePln: reasonableMin, maxIncomePln: comfortableMin },
    { level: 'stretch', minIncomePln: stretchMin, maxIncomePln: reasonableMin },
    { level: 'not_recommended', minIncomePln: null, maxIncomePln: stretchMin },
  ];
}
