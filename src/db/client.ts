import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

/** Driver-independent database type shared by Neon (production) and PGlite (local mode). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Stored on globalThis so that every module instance (Next.js bundles server code
// into several module graphs, and dev mode reloads modules) shares one database.
// Local mode keeps its data in memory, so a second instance would hold different data.
const DB_KEY = Symbol.for('wheelwise.db');
type GlobalWithDb = typeof globalThis & { [DB_KEY]?: Promise<Db> };
const globals = globalThis as GlobalWithDb;

function connectionString(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

/** A fresh, empty in-memory PGlite database: no migrations, no data. */
export async function createMemoryDb(): Promise<Db> {
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
  ]);
  return drizzle(new PGlite(), { schema });
}

async function initDb(): Promise<Db> {
  const url = connectionString();
  if (url) return drizzleNeon(url, { schema });

  if (process.env.NODE_ENV === 'production' && process.env.VERCEL === '1') {
    throw new Error(
      'DATABASE_URL is not set. Local mode (in-memory database) is disabled on Vercel in production; ' +
        'connect a Neon database and set DATABASE_URL.',
    );
  }

  // Imported lazily: these modules are not needed when DATABASE_URL is set.
  const [{ migrate }, { bootstrapFromFixtures }] = await Promise.all([
    import('./migrate'),
    import('./bootstrap'),
  ]);
  const db = await createMemoryDb();
  await migrate(db);
  await bootstrapFromFixtures(db);
  return db;
}

/** The process-wide database. Concurrent first calls share one initialisation. */
export function getDb(): Promise<Db> {
  const existing = globals[DB_KEY];
  if (existing) return existing;

  const pending = initDb();
  globals[DB_KEY] = pending;
  // A failed initialisation must not be cached, so that a later call can retry.
  pending.catch(() => {
    if (globals[DB_KEY] === pending) delete globals[DB_KEY];
  });
  return pending;
}

/** Test hook: replace the process-wide database, or pass `null` to reset it. */
export function setDbForTesting(db: Db | null): void {
  if (db) globals[DB_KEY] = Promise.resolve(db);
  else delete globals[DB_KEY];
}
