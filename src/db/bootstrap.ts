import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { carCatalogSchema, marketPriceSchema } from '@/lib/domain/schemas';
import type { CarInput, MarketPrice } from '@/lib/domain/types';
import type { Db } from './client';
import { replaceCatalogWith } from './repositories';
import { cars, marketPrices } from './schema';

async function readFixture<T>(name: string, schema: z.ZodType<T>): Promise<T> {
  const file = path.join(process.cwd(), 'data', 'fixtures', name);
  const parsed = schema.safeParse(JSON.parse(await readFile(file, 'utf8')));
  if (!parsed.success) {
    throw new Error(`Invalid fixture ${name}\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/** Reads and validates the two fixture files. */
export async function loadFixtures(): Promise<{ cars: CarInput[]; prices: MarketPrice[] }> {
  const [carList, prices] = await Promise.all([
    readFixture('cars.json', carCatalogSchema),
    readFixture('market-prices.json', z.array(marketPriceSchema)),
  ]);
  return { cars: carList, prices };
}

/**
 * Loads the fixtures into an empty database. Cars are loaded only when the `cars`
 * table has no rows; each market price only when its key is missing. Existing rows
 * are never changed or deleted.
 */
export async function bootstrapFromFixtures(
  db: Db,
): Promise<{ carsLoaded: number; pricesLoaded: number }> {
  const fixtures = await loadFixtures();

  const [existingCar] = await db.select({ id: cars.id }).from(cars).limit(1);
  let carsLoaded = 0;
  if (!existingCar) {
    const change = await replaceCatalogWith(db, fixtures.cars);
    carsLoaded = change.inserted + change.updated;
  }

  const inserted = await db
    .insert(marketPrices)
    .values(fixtures.prices.map((price) => ({ ...price, pricePln: String(price.pricePln) })))
    .onConflictDoNothing({ target: marketPrices.key })
    .returning({ key: marketPrices.key });

  return { carsLoaded, pricesLoaded: inserted.length };
}
