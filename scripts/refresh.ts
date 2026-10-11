import { runJob } from '../src/ingest/run-job';
import type { JobResult } from '../src/ingest/types';

const USAGE = 'Usage: npm run refresh [-- --dry-run]';

function printResult({ status, results }: JobResult, dryRun: boolean): void {
  console.log(`Daily job${dryRun ? ' (dry run, nothing written)' : ''}: ${status}`);
  for (const r of results) {
    console.log(`\n${r.source}: ${r.ok ? 'ok' : 'FAILED'}, updated ${r.updated}, skipped ${r.skipped}`);
    for (const note of r.notes ?? []) console.log(`  ${note}`);
    for (const error of r.errors) console.log(`  error [${error.item}]: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== '--dry-run');
  if (unknown.length > 0) {
    console.error(`Unknown argument: ${unknown.join(' ')}\n${USAGE}`);
    process.exitCode = 1;
    return;
  }

  const dryRun = args.includes('--dry-run');
  const result = await runJob('daily', { dryRun });
  printResult(result, dryRun);
  process.exitCode = result.status === 'failed' ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
