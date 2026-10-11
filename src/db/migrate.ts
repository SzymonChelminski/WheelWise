import path from 'node:path';
import { is } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { Db } from './client';
import type * as schema from './schema';

const config = { migrationsFolder: path.join(process.cwd(), 'drizzle') };

/** Applies the committed SQL migrations in `drizzle/`; already applied ones are skipped. */
export async function migrate(db: Db): Promise<void> {
  if (is(db, NeonHttpDatabase)) {
    await migrateNeon(db, config);
    return;
  }
  // Only PGlite is left; its migrator is loaded lazily to keep the PGlite package out of production.
  const { migrate: migratePglite } = await import('drizzle-orm/pglite/migrator');
  await migratePglite(db as PgliteDatabase<typeof schema>, config);
}
