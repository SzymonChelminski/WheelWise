import type { Assumptions, DriverAgeBand, Period } from './types';

export const DRIVER_AGE_BANDS = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-59',
  '60-64',
  '65-69',
  '70-74',
  '75+',
] as const satisfies readonly DriverAgeBand[];

export const ASSUMPTION_LIMITS = {
  annualMileageKm: { min: 1000, max: 100000 },
  ownershipYears: { min: 1, max: 10 },
  annualPremiumPln: { min: 0, max: 100000 },
} as const;

const DEFAULT_INSURANCE: Extract<Assumptions['insurance'], { mode: 'estimate' }> = {
  mode: 'estimate',
  driverAgeBand: '35-44',
  coverage: 'oc_ac',
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  annualMileageKm: 15000,
  ownershipYears: 5,
  insurance: DEFAULT_INSURANCE,
};

export const DEFAULT_PERIOD: Period = 'month';

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(params: QueryParams, name: string): string | undefined {
  const value = params[name];
  return Array.isArray(value) ? value[0] : value;
}

function parseNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function clamp(value: number, { min, max }: { min: number; max: number }): number {
  return Math.min(max, Math.max(min, value));
}

function parseClampedInteger(
  raw: string | undefined,
  limits: { min: number; max: number },
  fallback: number,
): number {
  const value = parseNumber(raw);
  return value !== undefined && Number.isInteger(value) ? clamp(value, limits) : fallback;
}

function isOneOf<T extends string>(options: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (options as readonly string[]).includes(value);
}

/** Reads user inputs from URL query parameters. Missing or invalid values fall back to defaults. */
export function parseAssumptions(params: QueryParams): { assumptions: Assumptions; period: Period } {
  const premium = parseNumber(firstValue(params, 'ins'));
  const age = firstValue(params, 'age');
  const coverage = firstValue(params, 'cov');
  const period = firstValue(params, 'period');

  const insurance: Assumptions['insurance'] =
    premium !== undefined
      ? { mode: 'custom', annualPremiumPln: clamp(premium, ASSUMPTION_LIMITS.annualPremiumPln) }
      : {
          mode: 'estimate',
          driverAgeBand: isOneOf(DRIVER_AGE_BANDS, age) ? age : DEFAULT_INSURANCE.driverAgeBand,
          coverage: isOneOf(['oc', 'oc_ac'] as const, coverage)
            ? coverage
            : DEFAULT_INSURANCE.coverage,
        };

  return {
    assumptions: {
      annualMileageKm: parseClampedInteger(
        firstValue(params, 'km'),
        ASSUMPTION_LIMITS.annualMileageKm,
        DEFAULT_ASSUMPTIONS.annualMileageKm,
      ),
      ownershipYears: parseClampedInteger(
        firstValue(params, 'years'),
        ASSUMPTION_LIMITS.ownershipYears,
        DEFAULT_ASSUMPTIONS.ownershipYears,
      ),
      insurance,
    },
    period: isOneOf(['month', 'year'] as const, period) ? period : DEFAULT_PERIOD,
  };
}

/** Builds the query string of user inputs. Values equal to the defaults are left out. */
export function serializeAssumptions(a: Assumptions, period: Period): URLSearchParams {
  const params = new URLSearchParams();
  const defaults = DEFAULT_ASSUMPTIONS;

  if (a.annualMileageKm !== defaults.annualMileageKm) params.set('km', String(a.annualMileageKm));
  if (a.ownershipYears !== defaults.ownershipYears) params.set('years', String(a.ownershipYears));

  if (a.insurance.mode === 'custom') {
    params.set('ins', String(a.insurance.annualPremiumPln));
  } else {
    if (a.insurance.driverAgeBand !== DEFAULT_INSURANCE.driverAgeBand) {
      params.set('age', a.insurance.driverAgeBand);
    }
    if (a.insurance.coverage !== DEFAULT_INSURANCE.coverage) {
      params.set('cov', a.insurance.coverage);
    }
  }

  if (period !== DEFAULT_PERIOD) params.set('period', period);
  return params;
}
