export interface SourceResult {
  source: string;
  ok: boolean;
  updated: number;
  skipped: number;
  errors: { item: string; message: string }[];
  /** Human-readable lines about the values read or written (what a dry run would update). */
  notes?: string[];
}

export interface JobContext {
  dryRun: boolean;
  /** Epoch milliseconds. No request starts after this time. */
  deadline: number;
  fetch: typeof fetch;
  now: () => Date;
}

export type SourceStep = (ctx: JobContext) => Promise<SourceResult>;

export interface JobStep {
  name: string;
  run: SourceStep;
}

export type JobStatus = 'ok' | 'partial' | 'failed';

export interface JobResult {
  status: JobStatus;
  results: SourceResult[];
}

export function newResult(source: string): SourceResult {
  return { source, ok: true, updated: 0, skipped: 0, errors: [], notes: [] };
}

export function addError(result: SourceResult, item: string, error: unknown): void {
  result.errors.push({ item, message: errorMessage(error) });
}

/**
 * A step is `ok` unless it failed without achieving anything. Errors on single
 * items are listed in `errors`, and they make the job status `partial`.
 */
export function finishResult(result: SourceResult): SourceResult {
  result.ok = result.errors.length === 0 || result.updated + result.skipped > 0;
  return result;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
