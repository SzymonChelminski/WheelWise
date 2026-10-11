import { finishRefreshRun, startRefreshRun } from '@/db/repositories';
import { dailySteps } from './jobs';
import {
  errorMessage,
  type JobContext,
  type JobResult,
  type JobStatus,
  type SourceResult,
} from './types';

export const CATALOG_TAG = 'catalog';
const DEFAULT_BUDGET_MS = 240_000;

export interface RunJobOptions {
  dryRun?: boolean;
  budgetMs?: number;
  fetch?: typeof fetch;
  now?: () => Date;
}

export function computeStatus(results: SourceResult[]): JobStatus {
  if (results.every((r) => r.ok && r.errors.length === 0)) return 'ok';
  if (results.every((r) => !r.ok)) return 'failed';
  return 'partial';
}

/**
 * Expire the cached catalogue data. Outside a Next.js server (the CLI) the call
 * throws, and the job goes on: the next deployment or cache lifetime picks up the data.
 */
async function revalidateCatalog(): Promise<boolean> {
  try {
    const { revalidateTag } = await import('next/cache');
    revalidateTag(CATALOG_TAG, 'max');
    return true;
  } catch {
    return false;
  }
}

export async function runJob(job: 'daily', opts: RunJobOptions = {}): Promise<JobResult> {
  const { dryRun = false, budgetMs = DEFAULT_BUDGET_MS } = opts;
  const now = opts.now ?? (() => new Date());
  const ctx: JobContext = {
    dryRun,
    deadline: now().getTime() + budgetMs,
    fetch: opts.fetch ?? globalThis.fetch,
    now,
  };

  const runId = dryRun ? null : await startRefreshRun(job);

  const results: SourceResult[] = [];
  for (const step of dailySteps) {
    try {
      results.push(await step.run(ctx));
    } catch (error) {
      results.push({
        source: step.name,
        ok: false,
        updated: 0,
        skipped: 0,
        errors: [{ item: step.name, message: errorMessage(error) }],
      });
    }
  }

  const status = computeStatus(results);
  const changed = results.some((r) => r.updated > 0);
  const revalidated = !dryRun && changed && (await revalidateCatalog());

  if (runId !== null) await finishRefreshRun(runId, status, { results, revalidated });
  return { status, results };
}
