import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useOptimistic, useRef } from 'react';
import { z } from 'zod';
import { usePathname, useRouter } from '@/i18n/navigation';
import { parseAssumptions, serializeAssumptions } from '@/lib/domain/assumptions';
import { assumptionsSchema } from '@/lib/domain/schemas';
import type { Assumptions, Period } from '@/lib/domain/types';
import {
  ASSUMPTION_PARAM_KEYS,
  hasAssumptionParams,
  toRecord,
  withQuery,
} from './assumption-params';
import { useUrlWriter } from './url-client';

/*
 * Client side of the assumptions: the URL is the source of truth, every change
 * is also written to localStorage, and a page opened without any assumption
 * parameter takes the stored values once. Nothing read from storage reaches the
 * cost engine without passing assumptionsSchema.
 */
export const ASSUMPTIONS_STORAGE_KEY = 'wheelwise.assumptions.v1';

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

/** Assumptions and period of the current URL, and the functions that change them. */
export function useAssumptions() {
  const searchParams = useSearchParams();
  const { write } = useUrlWriter();

  const fromUrl = useMemo(
    () => parseAssumptions(toRecord(new URLSearchParams(searchParams))),
    [searchParams],
  );
  // Shows the new value at once while the page for it is being fetched.
  const [state, setOptimistic] = useOptimistic<AssumptionState, AssumptionState>(
    fromUrl,
    (_current, next) => next,
  );

  const commit = useCallback(
    (next: AssumptionState) => {
      store(next);
      write(
        (params) => {
          for (const key of ASSUMPTION_PARAM_KEYS) params.delete(key);
          serializeAssumptions(next.assumptions, next.period).forEach((value, key) =>
            params.set(key, value),
          );
        },
        () => setOptimistic(next),
      );
    },
    [setOptimistic, write],
  );

  const setAssumptions = useCallback(
    (assumptions: Assumptions) => commit({ assumptions, period: state.period }),
    [commit, state.period],
  );
  const setPeriod = useCallback(
    (period: Period) => commit({ assumptions: state.assumptions, period }),
    [commit, state.assumptions],
  );

  return { assumptions: state.assumptions, period: state.period, setAssumptions, setPeriod };
}

/** On a page opened without assumption parameters: puts the stored values into the URL, once. */
export function useRestoreAssumptions(): void {
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const params = new URLSearchParams(window.location.search);
    if (hasAssumptionParams(params)) return;
    const stored = loadStored();
    if (!stored) return;
    const restored = serializeAssumptions(stored.assumptions, stored.period);
    if (restored.size === 0) return;
    router.replace(withQuery(pathname, params, restored), { scroll: false });
  }, [pathname, router]);
}
