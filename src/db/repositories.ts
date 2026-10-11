import { and, asc, desc, eq, getTableColumns, inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { carCatalogSchema, marketPriceSchema } from '@/lib/domain/schemas';
import type { Car, CarInput, MarketPrice, MarketPriceKey, MarketPrices } from '@/lib/domain/types';
import { getDb, type Db } from './client';
import { cars, marketPrices, refreshRuns } from './schema';

export interface RefreshRun {
  id: number;
  job: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'ok' | 'partial' | 'failed';
  summary: unknown;
}

export interface CatalogChange {
  inserted: number;
  updated: number;
  deactivated: number;
}

const COST_KEYS: readonly MarketPriceKey[] = ['petrol', 'diesel', 'lpg', 'electricity'];
const BATCH_SIZE = 200;

const toNumber = (value: string | null): number | null => (value === null ? null : Number(value));

function toCar(row: typeof cars.$inferSelect): Car {
  return {
    id: row.id,
    slug: row.slug,
    make: row.make,
    model: row.model,
    variant: row.variant,
    bodyType: row.bodyType,
    segment: row.segment,
    fuelType: row.fuelType,
    transmission: row.transmission,
    powerKw: row.powerKw,
    engineCc: row.engineCc,
    brandTier: row.brandTier,
    valueRetention: row.valueRetention,
    priceEur: row.priceEur,
    listPricePln: row.listPricePln,
    priceObservedAt: row.priceObservedAt,
    priceSourceUrl: row.priceSourceUrl,
    fuelL100: toNumber(row.fuelL100),
    electricKwh100: toNumber(row.electricKwh100),
  };
}

function toMarketPrice(row: typeof marketPrices.$inferSelect): MarketPrice {
  return {
    key: row.key,
    pricePln: Number(row.pricePln),
    observedAt: row.observedAt,
    source: row.source,
    sourceUrl: row.sourceUrl,
  };
}

export async function getActiveCars(): Promise<Car[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(cars)
    .where(eq(cars.active, true))
    .orderBy(asc(cars.make), asc(cars.model), asc(cars.variant), asc(cars.slug));
  return rows.map(toCar);
}

export async function getCarBySlug(slug: string): Promise<Car | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(cars)
    .where(and(eq(cars.slug, slug), eq(cars.active, true)))
    .limit(1);
  return row ? toCar(row) : null;
}

export async function getMarketPrices(): Promise<MarketPrices> {
  const db = await getDb();
  const rows = await db.select().from(marketPrices).where(inArray(marketPrices.key, [...COST_KEYS]));
  const byKey = new Map(rows.map((row) => [row.key, toMarketPrice(row)]));

  const missing = COST_KEYS.filter((key) => !byKey.has(key));
  if (missing.length > 0) {
    throw new Error(`Market prices are missing for: ${missing.join(', ')}`);
  }
  return Object.fromEntries(COST_KEYS.map((key) => [key, byKey.get(key)])) as MarketPrices;
}

export async function getEurRate(): Promise<MarketPrice | null> {
  const db = await getDb();
  const [row] = await db.select().from(marketPrices).where(eq(marketPrices.key, 'eur_pln')).limit(1);
  return row ? toMarketPrice(row) : null;
}

export async function getLastRefreshRun(): Promise<RefreshRun | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(refreshRuns)
    .where(and(isNotNull(refreshRuns.finishedAt), inArray(refreshRuns.status, ['ok', 'partial'])))
    .orderBy(desc(refreshRuns.finishedAt), desc(refreshRuns.id))
    .limit(1);
  if (!row || !row.finishedAt) return null;
  return {
    id: row.id,
    job: row.job,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt.toISOString(),
    status: row.status,
    summary: row.summary,
  };
}

export async function upsertMarketPrice(price: MarketPrice): Promise<void> {
  const valid = marketPriceSchema.parse(price);
  const db = await getDb();
  const values = { ...valid, pricePln: String(valid.pricePln) };
  await db
    .insert(marketPrices)
    .values(values)
    .onConflictDoUpdate({
      target: marketPrices.key,
      set: { ...values, fetchedAt: sql`now()` },
    });
}

export async function startRefreshRun(job: string): Promise<number> {
  const db = await getDb();
  const [row] = await db.insert(refreshRuns).values({ job }).returning({ id: refreshRuns.id });
  return row.id;
}

export async function finishRefreshRun(
  id: number,
  status: RefreshRun['status'],
  summary: unknown,
): Promise<void> {
  const db = await getDb();
  const updated = await db
    .update(refreshRuns)
    .set({ finishedAt: new Date(), status, summary })
    .where(eq(refreshRuns.id, id))
    .returning({ id: refreshRuns.id });
  if (updated.length === 0) throw new Error(`Refresh run ${id} does not exist`);
}

// Columns written on update. `slug` is the conflict key, `id` is generated,
// `active` and `updatedAt` are set explicitly.
const contentColumns: [string, AnyPgColumn][] = Object.entries(getTableColumns(cars)).filter(
  ([key]) => !['id', 'slug', 'active', 'updatedAt'].includes(key),
);
const excluded = (column: AnyPgColumn) => sql.raw(`excluded."${column.name}"`);

function toRow(car: CarInput): typeof cars.$inferInsert {
  return {
    ...car,
    fuelL100: car.fuelL100 === null ? null : String(car.fuelL100),
    electricKwh100: car.electricKwh100 === null ? null : String(car.electricKwh100),
  };
}

function validateCatalog(input: CarInput[]): CarInput[] {
  if (input.length === 0) {
    throw new Error('replaceCatalog: refusing an empty catalogue (it would deactivate every car)');
  }
  const parsed = carCatalogSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`replaceCatalog: invalid catalogue\n${z.prettifyError(parsed.error)}`);
  }
  // The cars.power_kw column is an integer; the shared schema also admits fractions.
  const fractional = parsed.data.find((car) => !Number.isInteger(car.powerKw));
  if (fractional) {
    throw new Error(`replaceCatalog: powerKw must be an integer ("${fractional.slug}")`);
  }
  return parsed.data;
}

/**
 * `replaceCatalog` on an explicit database. Needed by the bootstrap, which runs
 * while `getDb()` is still initialising. Without transactions (neon-http has none)
 * the writes are not atomic; input is validated before the first write.
 */
export async function replaceCatalogWith(db: Db, input: CarInput[]): Promise<CatalogChange> {
  const catalog = validateCatalog(input);
  let inserted = 0;
  let updated = 0;

  // Rows that are active and unchanged are skipped by `setWhere`, so a repeated
  // call writes nothing and returns zero counts.
  const changed = or(
    ...contentColumns.map(([, column]) => sql`${column} is distinct from ${excluded(column)}`),
    eq(cars.active, false),
  );
  const set = {
    ...Object.fromEntries(contentColumns.map(([key, column]) => [key, excluded(column)])),
    active: true,
    updatedAt: sql`now()`,
  };

  for (let start = 0; start < catalog.length; start += BATCH_SIZE) {
    const written = await db
      .insert(cars)
      .values(catalog.slice(start, start + BATCH_SIZE).map(toRow))
      // `xmax = 0` is true only for rows created by this statement, not for updated ones.
      .onConflictDoUpdate({ target: cars.slug, set, setWhere: changed })
      .returning({ wasInserted: sql<boolean>`(xmax = 0)` });
    for (const row of written) {
      if (row.wasInserted) inserted += 1;
      else updated += 1;
    }
  }

  const keep = new Set(catalog.map((car) => car.slug));
  const activeSlugs = await db.select({ slug: cars.slug }).from(cars).where(eq(cars.active, true));
  const stale = activeSlugs.map((row) => row.slug).filter((slug) => !keep.has(slug));
  for (let start = 0; start < stale.length; start += BATCH_SIZE) {
    await db
      .update(cars)
      .set({ active: false, updatedAt: sql`now()` })
      .where(inArray(cars.slug, stale.slice(start, start + BATCH_SIZE)));
  }

  return { inserted, updated, deactivated: stale.length };
}

export async function replaceCatalog(input: CarInput[]): Promise<CatalogChange> {
  return replaceCatalogWith(await getDb(), input);
}
