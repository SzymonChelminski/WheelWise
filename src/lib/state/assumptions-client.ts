import { useCallback, useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import { DEFAULT_ASSUMPTIONS, parseAssumptions, serializeAssumptions } from '@/lib/domain/assumptions';
import { assumptionsSchema } from '@/lib/domain/schemas';
import type { Assumptions, Period } from '@/lib/domain/types';
import { ASSUMPTION_PARAM_KEYS, hasAssumptionParams, toRecord } from './assumption-params';
import { useIntendedQuery, useQueryWriter } from './intended-query';

/*
 * Client side of the assumptions: the intended query of the page is the source of
 * truth, every change is also written to localStorage, and a page opened without any
 * assumption parameter takes the stored values once. Nothing read from storage reaches
 * the cost engine without passing assumptionsSchema.
 */
export const ASSUMPTIONS_STORAGE_KEY = 'wheelwise.assumptions.v1';

type Estimate = Extract<Assumptions['insurance'], { mode: 'estimate' }>;

/*
 * The age band and coverage last chosen for the insurance estimate. The URL drops
 * them while the user's own premium is active; this keeps them for the way back.
 */
let lastEstimate: Estimate | null = null;

function remember(assumptions: Assumptions): void {
  if (assumptions.insurance.mode === 'estimate') lastEstimate = assumptions.insurance;
}

export interface AssumptionState {
  assumptions: Assumptions;
  period: Period;
}

const storedSchema = z.object({
  assumptions: assumptionsSchema,
  period: z.enum(['month', 'year']),
});

/** The stored state, or null when nothing valid is stored (defaults are used then). */
function loadStored(): AssumptionState | null {
  try {
    const raw = window.localStorage.getItem(ASSUMPTIONS_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function store(state: AssumptionState): void {
  try {
    window.localStorage.setItem(ASSUMPTIONS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be full or blocked; the URL still carries the values.
  }
}

function fromQuery(params: URLSearchParams): AssumptionState {
  return parseAssumptions(toRecord(params));
}

/** Assumptions and period of the intended query, and the functions that change them. */
export function useAssumptions() {
  const intended = useIntendedQuery();
  const write = useQueryWriter();

  const state = useMemo(() => fromQuery(new URLSearchParams(intended)), [intended]);
  useEffect(() => remember(state.assumptions), [state]);

  /**
   * Applies `change` to the assumptions of the intended query as they are when the change is made.
   * Returning the argument as it is means there is nothing to change.
   */
  const update = useCallback(
    (change: (current: AssumptionState) => AssumptionState) => {
      const next = write((params) => {
        const current = fromQuery(params);
        const changed = change(current);
        if (changed === current) return;
        for (const key of ASSUMPTION_PARAM_KEYS) params.delete(key);
        serializeAssumptions(changed.assumptions, changed.period).forEach((value, key) =>
          params.set(key, value),
        );
      });
      const saved = fromQuery(new URLSearchParams(next));
      remember(saved.assumptions);
      store(saved);
    },
    [write],
  );

  const setAssumptions = useCallback(
    (change: (current: Assumptions) => Assumptions) =>
      update((current) => {
        const assumptions = change(current.assumptions);
        return assumptions === current.assumptions ? current : { ...current, assumptions };
      }),
    [update],
  );
  const setPeriod = useCallback(
    (period: Period) => update((current) => (current.period === period ? current : { ...current, period })),
    [update],
  );

  return {
    assumptions: state.assumptions,
    period: state.period,
    estimate: estimateOf(state.assumptions.insurance),
    setAssumptions,
    setPeriod,
  };
}

/** The estimate to show and to go back to: the current one, or the last one before the own premium. */
export function estimateOf(insurance: Assumptions['insurance']): Estimate {
  if (insurance.mode === 'estimate') return insurance;
  return lastEstimate ?? (DEFAULT_ASSUMPTIONS.insurance as Estimate);
}

/** On a page opened without assumption parameters: puts the stored values into the URL, once. */
export function useRestoreAssumptions(): void {
  const write = useQueryWriter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const stored = loadStored();
    if (!stored) return;
    const restored = serializeAssumptions(stored.assumptions, stored.period);
    if (restored.size === 0) return;
    write((params) => {
      if (hasAssumptionParams(params)) return;
      restored.forEach((value, key) => params.append(key, value));
    });
  }, [write]);
}
