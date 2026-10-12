import { asc, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import { createMemoryDb, setDbForTesting, type Db } from '@/db/client';
import { migrate } from '@/db/migrate';
import { upsertMarketPrice } from '@/db/repositories';
import { cars, marketPrices, refreshRuns } from '@/db/schema';
import type { MarketPrice } from '@/lib/domain/types';

const HOOK_TIMEOUT_MS = 60_000;

export interface TestDatabase {
  /** The in-memory database of the current test file. Available inside tests and hooks. */
  readonly db: Db;
}

interface Closable {
  $client?: { close?: () => Promise<void> };
}

/**
 * One fresh in-memory database for the calling test file, installed as the
 * process-wide database of the application code. All tables are emptied before
 * every test. The global `fetch` is replaced by one that always throws, so
 * code that was not given a fake `fetch` cannot reach the network.
 */
export function setupTestDatabase(options: { migrated?: boolean } = {}): TestDatabase {
  const { migrated = true } = options;
  const handle = {} as { db: Db };

  beforeAll(async () => {
    blockNetwork();
    handle.db = await createMemoryDb();
    if (migrated) await migrate(handle.db);
    setDbForTesting(handle.db);
  }, HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    setDbForTesting(handle.db);
    if (migrated) await clearTables(handle.db);
  });

  afterAll(async () => {
    setDbForTesting(null);
    vi.unstubAllGlobals();
    await (handle.db as Closable | undefined)?.$client?.close?.();
  }, HOOK_TIMEOUT_MS);

  return handle;
}

/** Replaces the global `fetch` by one that always throws. */
export function blockNetwork(): void {
  vi.stubGlobal('fetch', async (input: unknown) => {
    throw new Error(`Real network access is not allowed in tests (${String(input)})`);
  });
}

export async function clearTables(db: Db): Promise<void> {
  await db.execute(sql`truncate table cars, market_prices, refresh_runs restart identity`);
}

/** Every row of `cars`, active or not, ordered by slug. */
export async function allCarRows(db: Db) {
  return db.select().from(cars).orderBy(asc(cars.slug));
}

export async function carRow(db: Db, slug: string) {
  const [row] = await db.select().from(cars).where(eq(cars.slug, slug)).limit(1);
  return row ?? null;
}

export async function countCars(db: Db): Promise<{ all: number; active: number }> {
  const rows = await db.select({ active: cars.active }).from(cars);
  return { all: rows.length, active: rows.filter((row) => row.active).length };
}

/** The stored market price row of a key, or `null`. */
export async function storedPrice(db: Db, key: MarketPrice['key']): Promise<MarketPrice | null> {
  const [row] = await db.select().from(marketPrices).where(eq(marketPrices.key, key)).limit(1);
  if (!row) return null;
  return {
    key: row.key,
    pricePln: Number(row.pricePln),
    observedAt: row.observedAt,
    source: row.source,
    sourceUrl: row.sourceUrl,
  };
}

export async function allPriceRows(db: Db) {
  return db.select().from(marketPrices).orderBy(asc(marketPrices.key));
}

export async function allRefreshRuns(db: Db) {
  return db.select().from(refreshRuns).orderBy(asc(refreshRuns.id));
}

/** A market price row as a real source would have written it. */
export function realPrice(
  key: MarketPrice['key'],
  pricePln: number,
  observedAt: string,
  source = 'Earlier refresh',
): MarketPrice {
  return { key, pricePln, observedAt, source, sourceUrl: 'https://example.org/earlier-refresh' };
}

/** A market price row as the bundled sample data has it: its source is the marker "fixture". */
export function samplePrice(key: MarketPrice['key'], pricePln: number, observedAt: string): MarketPrice {
  return { key, pricePln, observedAt, source: 'fixture', sourceUrl: 'https://example.org/fixture' };
}

export async function seedPrices(...prices: MarketPrice[]): Promise<void> {
  for (const price of prices) await upsertMarketPrice(price);
}
