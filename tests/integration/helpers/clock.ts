import type { JobContext } from '@/ingest/types';

/** The moment every ingestion test runs at: Sunday 11 October 2026, 03:00 UTC. */
export const FIXED_NOW = '2026-10-11T03:00:00.000Z';

const BUDGET_MS = 240_000;

/** A clock that always shows the same moment. */
export function fixedClock(iso: string = FIXED_NOW): () => Date {
  const time = new Date(iso).getTime();
  return () => new Date(time);
}

/** The context a job step receives: fixed clock, given `fetch`, time budget not used up. */
export function makeContext(
  fetchFn: typeof fetch,
  overrides: Partial<Omit<JobContext, 'fetch'>> = {},
): JobContext {
  const now = overrides.now ?? fixedClock();
  return {
    dryRun: false,
    deadline: now().getTime() + BUDGET_MS,
    now,
    ...overrides,
    fetch: fetchFn,
  };
}

/** A context whose time budget ended one millisecond ago. */
export function expiredContext(fetchFn: typeof fetch): JobContext {
  const now = fixedClock();
  return makeContext(fetchFn, { now, deadline: now().getTime() - 1 });
}
