import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapFromFixtures, loadFixtures } from '@/db/bootstrap';
import { getDb, setDbForTesting } from '@/db/client';
import {
  getActiveCars,
  getCarBySlug,
  getEurRate,
  getMarketPrices,
  replaceCatalog,
} from '@/db/repositories';
import { marketPrices } from '@/db/schema';
import { makeCarInput } from '../../unit/helpers/cars';
import {
  allCarRows,
  allPriceRows,
  countCars,
  realPrice,
  seedPrices,
  storedPrice,
  setupTestDatabase,
} from '../helpers/database';

const database = setupTestDatabase();

const SAMPLE_PRICE_KEYS = ['diesel', 'electricity', 'eur_pln', 'lpg', 'petrol'];

describe('bootstrapFromFixtures', () => {
  it('loads the sample catalogue and the five sample prices into an empty database', async () => {
    const loaded = await bootstrapFromFixtures(database.db);

    expect(loaded).toEqual({ carsLoaded: 489, pricesLoaded: 5 });
    expect(await countCars(database.db)).toEqual({ all: 489, active: 489 });
    expect((await allPriceRows(database.db)).map((row) => row.key)).toEqual(SAMPLE_PRICE_KEYS);
  });

  it('makes the sample data readable through the repositories', async () => {
    await bootstrapFromFixtures(database.db);

    const cars = await getActiveCars();
    expect(cars).toHaveLength(489);
    expect(await getCarBySlug('alfa-romeo-giulia-sedan-hatchback-diesel-automatic-118kw')).toMatchObject({
      make: 'Alfa Romeo',
      model: 'GIULIA',
      variant: 'GIULIA 2.2 Diesel (160ch) AT8',
      priceEur: 45600,
      listPricePln: 201000,
      priceObservedAt: '2026-09-14',
      fuelL100: 5.1,
      electricKwh100: null,
    });

    const prices = await getMarketPrices();
    expect([prices.petrol.pricePln, prices.diesel.pricePln, prices.lpg.pricePln, prices.electricity.pricePln]).toEqual([
      6.5, 6.6, 3.1, 1.27,
    ]);
    expect(await getEurRate()).toEqual({
      key: 'eur_pln',
      pricePln: 4.3,
      observedAt: '2026-10-01',
      source: 'fixture',
      sourceUrl: 'https://example.org/fixture',
    });
  });

  it('loads the cars exactly as the sample file has them', async () => {
    await bootstrapFromFixtures(database.db);
    const fixtures = await loadFixtures();

    const stored = (await getActiveCars()).map((car) => {
      const { id, ...input } = car;
      expect(id).toBeGreaterThan(0);
      return input;
    });
    const bySlug = (a: { slug: string }, b: { slug: string }) => (a.slug < b.slug ? -1 : 1);
    expect(stored.sort(bySlug)).toEqual([...fixtures.cars].sort(bySlug));
  });

  it('loads nothing when cars and prices already exist', async () => {
    await bootstrapFromFixtures(database.db);
    const carsBefore = await allCarRows(database.db);
    const pricesBefore = await allPriceRows(database.db);

    const loaded = await bootstrapFromFixtures(database.db);

    expect(loaded).toEqual({ carsLoaded: 0, pricesLoaded: 0 });
    expect(await allCarRows(database.db)).toEqual(carsBefore);
    expect(await allPriceRows(database.db)).toEqual(pricesBefore);
  });

  it('does not touch an existing catalogue, however small, and does not deactivate its cars', async () => {
    await replaceCatalog([makeCarInput({ slug: 'my-own-car' })]);

    const loaded = await bootstrapFromFixtures(database.db);

    expect(loaded).toEqual({ carsLoaded: 0, pricesLoaded: 5 });
    expect((await allCarRows(database.db)).map((row) => [row.slug, row.active])).toEqual([['my-own-car', true]]);
  });

  it('loads no cars when the only stored cars are inactive', async () => {
    await replaceCatalog([makeCarInput({ slug: 'old-car' }), makeCarInput({ slug: 'kept-car' })]);
    await replaceCatalog([makeCarInput({ slug: 'kept-car' })]);

    const loaded = await bootstrapFromFixtures(database.db);

    expect(loaded.carsLoaded).toBe(0);
    expect(await countCars(database.db)).toEqual({ all: 2, active: 1 });
  });

  it('fills only the price keys that are missing and keeps the stored ones', async () => {
    const petrol = realPrice('petrol', 7.11, '2026-10-05', 'European Commission, Weekly Oil Bulletin');
    const rate = realPrice('eur_pln', 4.3775, '2026-10-09', 'Narodowy Bank Polski, tabela A');
    await seedPrices(petrol, rate);

    const loaded = await bootstrapFromFixtures(database.db);

    expect(loaded).toEqual({ carsLoaded: 489, pricesLoaded: 3 });
    expect(await storedPrice(database.db, 'petrol')).toEqual(petrol);
    expect(await storedPrice(database.db, 'eur_pln')).toEqual(rate);
    expect(await storedPrice(database.db, 'diesel')).toMatchObject({ pricePln: 6.6, source: 'fixture' });
    expect(await storedPrice(database.db, 'lpg')).toMatchObject({ pricePln: 3.1, source: 'fixture' });
    expect(await storedPrice(database.db, 'electricity')).toMatchObject({ pricePln: 1.27, source: 'fixture' });
  });

  it('fills a single missing price key', async () => {
    await bootstrapFromFixtures(database.db);
    await seedPrices(realPrice('diesel', 7.738, '2026-10-05'));
    await database.db.delete(marketPrices).where(eq(marketPrices.key, 'lpg'));

    const loaded = await bootstrapFromFixtures(database.db);

    expect(loaded).toEqual({ carsLoaded: 0, pricesLoaded: 1 });
    expect(await storedPrice(database.db, 'lpg')).toMatchObject({ pricePln: 3.1, source: 'fixture' });
    expect(await storedPrice(database.db, 'diesel')).toMatchObject({ pricePln: 7.738, source: 'Earlier refresh' });
  });
});

describe('getDb without a configured database', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('starts an in-memory database with the tables and the sample data, once per process', async () => {
    vi.stubEnv('DATABASE_URL', '');
    setDbForTesting(null);

    const [first, second] = await Promise.all([getDb(), getDb()]);
    try {
      expect(second).toBe(first);
      expect(await getDb()).toBe(first);
      expect(first).not.toBe(database.db);
      expect(await getActiveCars()).toHaveLength(489);
      expect((await getEurRate())?.pricePln).toBe(4.3);
      expect(Object.keys(await getMarketPrices()).sort()).toEqual(['diesel', 'electricity', 'lpg', 'petrol']);
    } finally {
      setDbForTesting(null);
      await (first as unknown as { $client: { close: () => Promise<void> } }).$client.close();
    }
  }, 30_000);

  it('refuses to start in production on Vercel and names DATABASE_URL', async () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    setDbForTesting(null);

    await expect(getDb()).rejects.toThrow(/DATABASE_URL/);
    // A failed start is not remembered: the next call tries again.
    await expect(getDb()).rejects.toThrow(/DATABASE_URL/);
    setDbForTesting(null);
  });
});
