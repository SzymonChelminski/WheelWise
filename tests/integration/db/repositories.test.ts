import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  finishRefreshRun,
  getActiveCars,
  getCarBySlug,
  getEurRate,
  getLastRefreshRun,
  getMarketPrices,
  replaceCatalog,
  startRefreshRun,
  upsertMarketPrice,
} from '@/db/repositories';
import { cars as carsTable, marketPrices as marketPricesTable } from '@/db/schema';
import type { CarInput, MarketPrice } from '@/lib/domain/types';
import { makeCarInput, makeCarInputOfFuel } from '../../unit/helpers/cars';
import {
  allCarRows,
  allRefreshRuns,
  carRow,
  countCars,
  realPrice,
  seedPrices,
  storedPrice,
  setupTestDatabase,
} from '../helpers/database';

const database = setupTestDatabase();

const car = (slug: string, overrides: Partial<CarInput> = {}): CarInput =>
  makeCarInput({ slug, ...overrides });

/** `count` schema-valid cars with the slugs `<prefix>-0001`, `<prefix>-0002`, ... */
function manyCars(count: number, prefix = 'bulk'): CarInput[] {
  return Array.from({ length: count }, (_, index) =>
    car(`${prefix}-${String(index + 1).padStart(4, '0')}`, { priceEur: 10000 + index }),
  );
}

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

async function columnsOf(table: string): Promise<string[]> {
  const result = await database.db.execute(sql`
    select table_name, column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = ${table}
    order by ordinal_position
  `);
  const rows = (result as unknown as { rows: ColumnInfo[] }).rows;
  return rows.map(
    (row) => `${row.column_name} ${row.data_type}${row.is_nullable === 'YES' ? ' null' : ''}`,
  );
}

const fourCostPrices = (): MarketPrice[] => [
  realPrice('petrol', 6.5, '2026-10-05'),
  realPrice('diesel', 6.6, '2026-10-05'),
  realPrice('lpg', 3.1, '2026-10-05'),
  realPrice('electricity', 1.27, '2026-01-01'),
];

describe('migrations', () => {
  it('create exactly the tables cars, market_prices and refresh_runs', async () => {
    const result = await database.db.execute(sql`
      select table_name from information_schema.tables
      where table_schema = 'public' order by table_name
    `);
    const names = (result as unknown as { rows: { table_name: string }[] }).rows.map((row) => row.table_name);
    expect(names).toEqual(['cars', 'market_prices', 'refresh_runs']);
  });

  it('create the cars table with its columns', async () => {
    expect(await columnsOf('cars')).toEqual([
      'id integer',
      'slug text',
      'make text',
      'model text',
      'variant text',
      'body_type text',
      'segment text',
      'fuel_type text',
      'transmission text',
      'power_kw integer',
      'engine_cc integer null',
      'brand_tier text',
      'value_retention text',
      'price_eur integer',
      'list_price_pln integer',
      'price_observed_at date',
      'price_source_url text',
      'fuel_l100 numeric null',
      'electric_kwh100 numeric null',
      'active boolean',
      'updated_at timestamp with time zone',
    ]);
  });

  it('create the market_prices table with its columns', async () => {
    expect(await columnsOf('market_prices')).toEqual([
      'key text',
      'price_pln numeric',
      'observed_at date',
      'source text',
      'source_url text',
      'fetched_at timestamp with time zone',
    ]);
  });

  it('create the refresh_runs table with its columns', async () => {
    expect(await columnsOf('refresh_runs')).toEqual([
      'id integer',
      'job text',
      'started_at timestamp with time zone',
      'finished_at timestamp with time zone null',
      'status text',
      'summary jsonb null',
    ]);
  });

  it('number the cars automatically and keep slugs unique', async () => {
    const { slug, ...rest } = car('unique-slug');
    const values = { ...rest, slug, fuelL100: '6.0', electricKwh100: null };
    const [first] = await database.db.insert(carsTable).values(values).returning({ id: carsTable.id });
    expect(first.id).toBe(1);
    await expect(database.db.insert(carsTable).values(values)).rejects.toThrow();
    expect(await countCars(database.db)).toEqual({ all: 1, active: 1 });
  });

  it('allow one market price row per key', async () => {
    const row = { key: 'petrol' as const, pricePln: '6.5', observedAt: '2026-10-05', source: 's', sourceUrl: 'https://example.org' };
    await database.db.insert(marketPricesTable).values(row);
    await expect(database.db.insert(marketPricesTable).values(row)).rejects.toThrow();
  });
});

describe('replaceCatalog', () => {
  it('inserts new cars as active and reports their number', async () => {
    const change = await replaceCatalog([car('car-a'), car('car-b'), car('car-c')]);
    expect(change).toEqual({ inserted: 3, updated: 0, deactivated: 0 });

    const rows = await allCarRows(database.db);
    expect(rows.map((row) => [row.slug, row.active])).toEqual([
      ['car-a', true],
      ['car-b', true],
      ['car-c', true],
    ]);
  });

  it('stores every field of a car, and the car reads back unchanged', async () => {
    const petrol = car('petrol-car');
    const electric = makeCarInputOfFuel('ev', { slug: 'electric-car', make: 'Volta', powerKw: 150 });
    const plugIn = makeCarInputOfFuel('phev', { slug: 'plug-in-car', fuelL100: 1.3, electricKwh100: 16.4 });
    await replaceCatalog([petrol, electric, plugIn]);

    const { id: petrolId, ...storedPetrol } = (await getCarBySlug('petrol-car'))!;
    const { id: electricId, ...storedElectric } = (await getCarBySlug('electric-car'))!;
    const { id: plugInId, ...storedPlugIn } = (await getCarBySlug('plug-in-car'))!;
    expect(storedPetrol).toEqual(petrol);
    expect(storedElectric).toEqual(electric);
    expect(storedPlugIn).toEqual(plugIn);
    expect(new Set([petrolId, electricId, plugInId]).size).toBe(3);
  });

  it('a second call with the same cars changes nothing and reports zero counts', async () => {
    const catalog = [car('car-a'), car('car-b'), makeCarInputOfFuel('ev', { slug: 'car-c' })];
    await replaceCatalog(catalog);
    const before = await allCarRows(database.db);

    const change = await replaceCatalog(catalog);

    expect(change).toEqual({ inserted: 0, updated: 0, deactivated: 0 });
    expect(await allCarRows(database.db)).toEqual(before);
  });

  it('updates a changed car, keeps its id and counts only that car as updated', async () => {
    await replaceCatalog([car('car-a'), car('car-b')]);
    const before = await allCarRows(database.db);

    const change = await replaceCatalog([car('car-a', { listPricePln: 123400, priceEur: 28000 }), car('car-b')]);

    expect(change).toEqual({ inserted: 0, updated: 1, deactivated: 0 });
    const after = await allCarRows(database.db);
    expect(after[0]).toMatchObject({ id: before[0].id, slug: 'car-a', listPricePln: 123400, priceEur: 28000 });
    expect(after[0].updatedAt.getTime()).toBeGreaterThanOrEqual(before[0].updatedAt.getTime());
    // The untouched car is not rewritten.
    expect(after[1]).toEqual(before[1]);
  });

  it('updates every field other than the slug', async () => {
    await replaceCatalog([car('car-a')]);
    const changed: CarInput = {
      slug: 'car-a',
      make: 'Otherma',
      model: 'OTHER',
      variant: 'Other 2.0 Top',
      bodyType: 'suv',
      segment: 'E',
      fuelType: 'phev',
      transmission: 'automatic',
      powerKw: 180,
      engineCc: 1998,
      brandTier: 'premium',
      valueRetention: 'low',
      priceEur: 61000,
      listPricePln: 268900,
      priceObservedAt: '2026-11-30',
      priceSourceUrl: 'https://example.org/other-dataset',
      fuelL100: 1.4,
      electricKwh100: 18.2,
    };

    const change = await replaceCatalog([changed]);

    expect(change).toEqual({ inserted: 0, updated: 1, deactivated: 0 });
    const { id, ...stored } = (await getCarBySlug('car-a'))!;
    expect(stored).toEqual(changed);
    expect(id).toBe(1);
  });

  it('counts a change from a value to null as an update', async () => {
    await replaceCatalog([car('car-a', { engineCc: 1498 })]);
    const change = await replaceCatalog([car('car-a', { engineCc: null })]);
    expect(change).toEqual({ inserted: 0, updated: 1, deactivated: 0 });
    expect((await getCarBySlug('car-a'))!.engineCc).toBeNull();
  });

  it('deactivates cars that are missing from the new catalogue, without deleting them', async () => {
    await replaceCatalog([car('car-a'), car('car-b'), car('car-c')]);

    const change = await replaceCatalog([car('car-b')]);

    expect(change).toEqual({ inserted: 0, updated: 0, deactivated: 2 });
    expect((await allCarRows(database.db)).map((row) => [row.slug, row.active])).toEqual([
      ['car-a', false],
      ['car-b', true],
      ['car-c', false],
    ]);
    expect((await getActiveCars()).map((entry) => entry.slug)).toEqual(['car-b']);
    expect(await getCarBySlug('car-a')).toBeNull();
  });

  it('does not count an already inactive car as deactivated again', async () => {
    await replaceCatalog([car('car-a'), car('car-b')]);
    await replaceCatalog([car('car-b')]);
    const change = await replaceCatalog([car('car-b')]);
    expect(change).toEqual({ inserted: 0, updated: 0, deactivated: 0 });
  });

  it('reactivates a car that comes back, with the same id, and counts it as updated', async () => {
    await replaceCatalog([car('car-a'), car('car-b')]);
    const original = (await getCarBySlug('car-a'))!;
    await replaceCatalog([car('car-b')]);
    expect(await getCarBySlug('car-a')).toBeNull();

    const change = await replaceCatalog([car('car-a'), car('car-b')]);

    expect(change).toEqual({ inserted: 0, updated: 1, deactivated: 0 });
    expect(await getCarBySlug('car-a')).toEqual(original);
    expect(await countCars(database.db)).toEqual({ all: 2, active: 2 });
  });

  it('inserts, updates and deactivates in one call', async () => {
    await replaceCatalog([car('car-a'), car('car-b'), car('car-c')]);
    const change = await replaceCatalog([car('car-b', { listPricePln: 99900 }), car('car-c'), car('car-d')]);
    expect(change).toEqual({ inserted: 1, updated: 1, deactivated: 1 });
    expect((await getActiveCars()).map((entry) => entry.slug).sort()).toEqual(['car-b', 'car-c', 'car-d']);
  });

  it('refuses an empty catalogue and leaves every car active', async () => {
    await replaceCatalog([car('car-a'), car('car-b')]);
    const before = await allCarRows(database.db);

    await expect(replaceCatalog([])).rejects.toThrow(/empty/i);

    expect(await allCarRows(database.db)).toEqual(before);
  });

  it.each([
    ['a slug with upper-case letters', { slug: 'Car-X' }],
    ['a negative price', { priceEur: -1 }],
    ['a price in PLN that is not a whole number', { listPricePln: 100000.5 }],
    ['an unknown fuel type', { fuelType: 'hydrogen' as CarInput['fuelType'] }],
    ['a date that is not a date', { priceObservedAt: '14.09.2026' }],
    ['a source address that is not http', { priceSourceUrl: 'ftp://example.org/x' }],
    ['a petrol car without fuel consumption', { fuelL100: null }],
    ['a petrol car with electricity consumption', { electricKwh100: 15 }],
    ['an empty make', { make: '  ' }],
    ['power that is not a whole number', { powerKw: 96.5 }],
    ['power of zero', { powerKw: 0 }],
  ] as [string, Partial<CarInput>][])('refuses a catalogue that contains %s and writes nothing', async (_what, overrides) => {
    await replaceCatalog([car('car-a'), car('car-b')]);
    const before = await allCarRows(database.db);

    const invalid = [car('car-a', { listPricePln: 55500 }), car('car-new'), car('car-x', overrides)];
    await expect(replaceCatalog(invalid)).rejects.toThrow();

    expect(await allCarRows(database.db)).toEqual(before);
  });

  it('refuses a catalogue with the same slug twice and writes nothing', async () => {
    await expect(replaceCatalog([car('car-a'), car('car-a', { priceEur: 30000 })])).rejects.toThrow(/duplicate/i);
    expect(await countCars(database.db)).toEqual({ all: 0, active: 0 });
  });

  it('writes a catalogue larger than one batch of 200 cars completely', async () => {
    const catalog = manyCars(450);

    const change = await replaceCatalog(catalog);

    expect(change).toEqual({ inserted: 450, updated: 0, deactivated: 0 });
    const rows = await allCarRows(database.db);
    expect(rows.map((row) => row.slug)).toEqual(catalog.map((entry) => entry.slug));
    expect(rows.map((row) => row.priceEur)).toEqual(catalog.map((entry) => entry.priceEur));
    expect(new Set(rows.map((row) => row.id)).size).toBe(450);
  });

  it('repeats, updates and deactivates across batches of 200 cars', async () => {
    const catalog = manyCars(450);
    await replaceCatalog(catalog);
    expect(await replaceCatalog(catalog)).toEqual({ inserted: 0, updated: 0, deactivated: 0 });

    // Keep cars 211..450, change the price of cars 401..450, add 5 new ones.
    const next = [
      ...catalog.slice(210, 400),
      ...catalog.slice(400).map((entry) => ({ ...entry, listPricePln: 111100 })),
      ...manyCars(5, 'new'),
    ];
    const change = await replaceCatalog(next);

    expect(change).toEqual({ inserted: 5, updated: 50, deactivated: 210 });
    expect(await countCars(database.db)).toEqual({ all: 455, active: 245 });
    expect((await carRow(database.db, 'bulk-0210'))!.active).toBe(false);
    expect((await carRow(database.db, 'bulk-0211'))!.active).toBe(true);
    expect((await carRow(database.db, 'bulk-0400'))!.listPricePln).toBe(100000);
    expect((await carRow(database.db, 'bulk-0401'))!.listPricePln).toBe(111100);
  });
});

describe('getActiveCars and getCarBySlug', () => {
  it('order the cars by make, then model, then name, then slug', async () => {
    await replaceCatalog([
      car('s-08', { make: 'Bravo', model: 'ALPHA', variant: 'Alpha One' }),
      car('s-02', { make: 'Alfa', model: 'BETA', variant: 'Beta Two' }),
      car('s-07', { make: 'Alfa', model: 'ALPHA', variant: 'Alpha Two' }),
      car('s-05', { make: 'Alfa', model: 'ALPHA', variant: 'Alpha One' }),
      car('s-01', { make: 'Alfa', model: 'BETA', variant: 'Beta One' }),
      car('s-03', { make: 'Alfa', model: 'ALPHA', variant: 'Alpha One' }),
    ]);

    const list = await getActiveCars();

    expect(list.map((entry) => [entry.make, entry.model, entry.variant, entry.slug])).toEqual([
      ['Alfa', 'ALPHA', 'Alpha One', 's-03'],
      ['Alfa', 'ALPHA', 'Alpha One', 's-05'],
      ['Alfa', 'ALPHA', 'Alpha Two', 's-07'],
      ['Alfa', 'BETA', 'Beta One', 's-01'],
      ['Alfa', 'BETA', 'Beta Two', 's-02'],
      ['Bravo', 'ALPHA', 'Alpha One', 's-08'],
    ]);
  });

  it('return an empty list and null when there are no cars', async () => {
    expect(await getActiveCars()).toEqual([]);
    expect(await getCarBySlug('car-a')).toBeNull();
  });

  it('getCarBySlug returns null for an unknown slug and the car for a known one', async () => {
    await replaceCatalog([car('car-a'), car('car-b', { make: 'Second' })]);
    expect(await getCarBySlug('car-zzz')).toBeNull();
    expect(await getCarBySlug('')).toBeNull();
    expect(await getCarBySlug('CAR-A')).toBeNull();
    expect((await getCarBySlug('car-b'))!.make).toBe('Second');
  });

  it('treat a slug with SQL in it as plain text', async () => {
    await replaceCatalog([car('car-a')]);
    expect(await getCarBySlug("car-a' or '1'='1")).toBeNull();
    expect(await getCarBySlug("'; drop table cars; --")).toBeNull();
    expect(await countCars(database.db)).toEqual({ all: 1, active: 1 });
  });

  it('return numbers as numbers, the date as YYYY-MM-DD and missing values as null', async () => {
    await replaceCatalog([
      car('petrol-car', { fuelL100: 5.3, engineCc: 999, powerKw: 67 }),
      makeCarInputOfFuel('ev', { slug: 'electric-car', electricKwh100: 16.4 }),
    ]);

    const petrol = (await getCarBySlug('petrol-car'))!;
    expect(petrol.fuelL100).toBe(5.3);
    expect(petrol.electricKwh100).toBeNull();
    expect(petrol.engineCc).toBe(999);
    expect(petrol.powerKw).toBe(67);
    expect(petrol.priceEur).toBe(23000);
    expect(petrol.listPricePln).toBe(100000);
    expect(petrol.priceObservedAt).toBe('2026-10-01');
    expect(typeof petrol.id).toBe('number');

    const [electric] = (await getActiveCars()).filter((entry) => entry.slug === 'electric-car');
    expect(electric.fuelL100).toBeNull();
    expect(electric.electricKwh100).toBe(16.4);
    expect(electric.engineCc).toBeNull();
  });
});

describe('market prices', () => {
  it('getMarketPrices returns the four cost prices with numbers, without the exchange rate', async () => {
    await seedPrices(...fourCostPrices(), realPrice('eur_pln', 4.3775, '2026-10-09'));

    const prices = await getMarketPrices();

    expect(Object.keys(prices).sort()).toEqual(['diesel', 'electricity', 'lpg', 'petrol']);
    expect(prices.petrol).toEqual(realPrice('petrol', 6.5, '2026-10-05'));
    expect(prices.diesel.pricePln).toBe(6.6);
    expect(prices.lpg.pricePln).toBe(3.1);
    expect(prices.electricity).toEqual(realPrice('electricity', 1.27, '2026-01-01'));
  });

  it.each(['petrol', 'diesel', 'lpg', 'electricity'] as const)(
    'getMarketPrices throws and names the key when %s is missing',
    async (missing) => {
      await seedPrices(...fourCostPrices().filter((price) => price.key !== missing));
      await expect(getMarketPrices()).rejects.toThrow(new RegExp(`missing.*\\b${missing}\\b`, 'i'));
    },
  );

  it('getMarketPrices throws on an empty table and names all four keys', async () => {
    await expect(getMarketPrices()).rejects.toThrow(/petrol.*diesel.*lpg.*electricity/);
  });

  it('getMarketPrices does not need the exchange rate', async () => {
    await seedPrices(...fourCostPrices());
    await expect(getMarketPrices()).resolves.toBeDefined();
  });

  it('getEurRate returns null without a rate and the stored rate otherwise', async () => {
    expect(await getEurRate()).toBeNull();
    await seedPrices(...fourCostPrices());
    expect(await getEurRate()).toBeNull();

    await seedPrices(realPrice('eur_pln', 4.3775, '2026-10-09', 'Narodowy Bank Polski, tabela A'));
    expect(await getEurRate()).toEqual({
      key: 'eur_pln',
      pricePln: 4.3775,
      observedAt: '2026-10-09',
      source: 'Narodowy Bank Polski, tabela A',
      sourceUrl: 'https://example.org/earlier-refresh',
    });
  });

  it('upsertMarketPrice replaces the row of the same key', async () => {
    await upsertMarketPrice(realPrice('petrol', 6.5, '2026-10-05'));
    await upsertMarketPrice({
      key: 'petrol',
      pricePln: 6.6642,
      observedAt: '2026-10-12',
      source: 'Another source',
      sourceUrl: 'https://example.org/another',
    });

    expect(await storedPrice(database.db, 'petrol')).toEqual({
      key: 'petrol',
      pricePln: 6.6642,
      observedAt: '2026-10-12',
      source: 'Another source',
      sourceUrl: 'https://example.org/another',
    });
    expect(await storedPrice(database.db, 'diesel')).toBeNull();
  });

  it.each([
    ['a negative price', { pricePln: -1 }],
    ['a price of zero', { pricePln: 0 }],
    ['a price that is not a number', { pricePln: Number.NaN }],
    ['an unknown key', { key: 'hydrogen' as MarketPrice['key'] }],
    ['a date that is not a date', { observedAt: 'yesterday' }],
    ['an empty source', { source: '' }],
    ['a source address that is not a URL', { sourceUrl: 'not a url' }],
  ] as [string, Partial<MarketPrice>][])('upsertMarketPrice refuses %s and keeps the stored row', async (_what, overrides) => {
    const stored = realPrice('petrol', 6.5, '2026-10-05');
    await upsertMarketPrice(stored);

    await expect(upsertMarketPrice({ ...realPrice('petrol', 7.7, '2026-10-12'), ...overrides })).rejects.toThrow();

    expect(await storedPrice(database.db, 'petrol')).toEqual(stored);
  });
});

describe('refresh runs', () => {
  it('a started run is numbered, unfinished and counts as failed until it is finished', async () => {
    const first = await startRefreshRun('daily');
    const second = await startRefreshRun('daily');
    expect([first, second]).toEqual([1, 2]);

    const rows = await allRefreshRuns(database.db);
    expect(rows.map((row) => [row.id, row.job, row.status, row.finishedAt, row.summary])).toEqual([
      [1, 'daily', 'failed', null, null],
      [2, 'daily', 'failed', null, null],
    ]);
    expect(rows[0].startedAt).toBeInstanceOf(Date);
  });

  it('getLastRefreshRun returns null when there is no run', async () => {
    expect(await getLastRefreshRun()).toBeNull();
  });

  it('getLastRefreshRun ignores a run that never finished', async () => {
    await startRefreshRun('daily');
    expect(await getLastRefreshRun()).toBeNull();
  });

  it('getLastRefreshRun ignores a run that finished as failed', async () => {
    const id = await startRefreshRun('daily');
    await finishRefreshRun(id, 'failed', { results: [] });
    expect(await getLastRefreshRun()).toBeNull();
  });

  it.each(['ok', 'partial'] as const)('getLastRefreshRun returns a run that finished as %s, with its summary', async (status) => {
    const id = await startRefreshRun('daily');
    const summary = { results: [{ source: 'exchange-rate', ok: true, updated: 1, skipped: 0, errors: [] }], revalidated: false };
    await finishRefreshRun(id, status, summary);

    const run = (await getLastRefreshRun())!;

    expect(run).toMatchObject({ id, job: 'daily', status, summary });
    expect(run.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(run.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Date.parse(run.finishedAt!)).toBeGreaterThanOrEqual(Date.parse(run.startedAt));
  });

  it('getLastRefreshRun returns the latest good run, skipping later failed and unfinished ones', async () => {
    const first = await startRefreshRun('daily');
    await finishRefreshRun(first, 'ok', { n: 1 });
    const second = await startRefreshRun('daily');
    await finishRefreshRun(second, 'partial', { n: 2 });
    const third = await startRefreshRun('daily');
    await finishRefreshRun(third, 'failed', { n: 3 });
    await startRefreshRun('daily');

    expect(await getLastRefreshRun()).toMatchObject({ id: second, status: 'partial', summary: { n: 2 } });
  });

  it('finishRefreshRun throws for a run that does not exist', async () => {
    await expect(finishRefreshRun(999, 'ok', {})).rejects.toThrow(/999/);
    expect(await allRefreshRuns(database.db)).toEqual([]);
  });
});
