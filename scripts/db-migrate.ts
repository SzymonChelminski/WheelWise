import { getDb } from '../src/db/client';
import { migrate } from '../src/db/migrate';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log('local mode: nothing to migrate');
    return;
  }
  await migrate(await getDb());
  console.log('migrations applied');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
