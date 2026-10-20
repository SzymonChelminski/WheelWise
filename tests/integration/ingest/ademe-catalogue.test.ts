import { describe, expect, it } from 'vitest';
import { bootstrapFromFixtures } from '@/db/bootstrap';
import { getActiveCars, getCarBySlug, replaceCatalog } from '@/db/repositories';
import { catalogueStep } from '@/ingest/sources/ademe-catalogue';
import type { SourceResult } from '@/ingest/types';
import type { CarInput } from '@/lib/domain/types';
import { makeCarInput } from '../../unit/helpers/cars';
import { expiredContext, makeContext } from '../helpers/clock';
import { allCarRows, countCars, realPrice, samplePrice, seedPrices, setupTestDatabase } from '../helpers/database';
import { createFakeFetch, jsonReply, statusReply, type FakeFetch, type Reply } from '../helpers/fake-fetch';
import {
  ADEME_FIELDS,
  ademeNextUrl,
  ademeRoutes,
  asApiRow,
  datasetSnapshot,
  nbpBody,
  nbpRangeReply,
  readRecorded,
  URLS,
  type AdemeOptions,
} from '../helpers/sources';

// Catalogue step. The clock stands at 2026-10-11 03:00 UTC.
//
// The dataset copy holds 3604 rows (data of 2026-09-14); the builder turns them into
// 489 cars and skips 70 rows (68 unsupported energy, 2 price out of range).
// Reference car: Alfa Romeo Giulia diesel 118 kW, 45 600 EUR.
//   at 4.3775: 45600 * 4.3775 * 1.23 / 1.20 = 204 604.35 -> 204 600 PLN
//   at 4.40:   205 656 -> 205 700 PLN;  at 4.41: 206 123.4 -> 206 100 PLN

const database = setupTestDatabase();

const GIULIA = 'alfa-romeo-giulia-diesel-automatic-160km';
const NBP = 'Narodowy Bank Polski, tabela A';
const TODAY_RANGE = URLS.nbpRange('2026-10-05', '2026-10-11');

const apiRows = () => datasetSnapshot().rows.map(asApiRow);

/** A row the dataset could contain, in the shape of the API (empty fields left out). */
function apiRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    Marque: 'DACIA',
    Modèle: 'SANDERO',
    Description_Commerciale: 'SANDERO (91ch)',
    Energie: 'ESSENCE',
    Carrosserie: 'BERLINE',
    Gamme: 'INFERIEURE',
    Cylindrée: 999,
    Puissance_maximale: 67,
    Type_de_boite: 'MECANIQUE',
    Conso_vitesse_mixte_Min: 5.1,
    Conso_vitesse_mixte_Max: 5.5,
    Prix_véhicule: 14400,
    ...overrides,
  };
}

const invalidRows = (count: number) =>
  Array.from({ length: count }, () => {
    const withoutMake = apiRow();
    delete withoutMake.Marque;
    return withoutMake;
  });

function sources(options: AdemeOptions = {}, extra: Record<string, Reply> = {}): FakeFetch {
  return createFakeFetch({ ...ademeRoutes(options), ...extra });
}

const storeRate = (rate: number, observedAt = '2026-10-09') => seedPrices(realPrice('eur_pln', rate, observedAt, NBP));

/** Two cars that do not exist in the dataset: the catalogue "before" the step runs. */
const existingCars = (): CarInput[] => [
  makeCarInput({ slug: 'existing-one', priceObservedAt: '2026-06-15' }),
  makeCarInput({ slug: 'existing-two', priceObservedAt: '2026-06-15' }),
];

/** `count` active cars that do not exist in the dataset. */
const manyExistingCars = (count: number): CarInput[] =>
  Array.from({ length: count }, (_, index) =>
    makeCarInput({ slug: `existing-${String(index + 1).padStart(4, '0')}`, priceObservedAt: '2026-06-15' }),
  );

async function expectCatalogueUntouched(result: SourceResult, before: unknown): Promise<void> {
  expect(result).toMatchObject({ source: 'catalogue', ok: false, updated: 0, skipped: 0 });
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].item).toBe('catalogue');
  expect(await allCarRows(database.db)).toEqual(before);
}

describe('catalogue step - download and write', () => {
  it('follows the "next" links, collects every row and writes the catalogue', async () => {
    await storeRate(4.3775);
    const fake = sources();

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ source: 'catalogue', ok: true, updated: 489, skipped: 70, errors: [] });
    expect(fake.urls()).toEqual([
      URLS.ademeMetadata,
      URLS.ademeRows,
      ademeNextUrl(1000),
      ademeNextUrl(2000),
      ademeNextUrl(3000),
    ]);
    expect(result.notes?.join('\n')).toMatch(/rows downloaded 3604 in 4 pages, valid 3604, dropped 0/);
    expect(await countCars(database.db)).toEqual({ all: 489, active: 489 });
  });

  it('asks for 1000 rows per page and only for the fields it uses', async () => {
    await storeRate(4.3775);
    const fake = sources();

    await catalogueStep(makeContext(fake.fetch));

    const url = new URL(fake.urls()[1]);
    expect(url.origin + url.pathname).toBe(
      'https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/lines',
    );
    expect(url.searchParams.get('size')).toBe('1000');
    expect(url.searchParams.get('select')?.split(',')).toEqual([...ADEME_FIELDS]);
  });

  it('requests the dataset API only, never a web page', async () => {
    const fake = sources({}, { [TODAY_RANGE]: nbpRangeReply('2026-10-05_2026-10-11') });

    await catalogueStep(makeContext(fake.fetch));

    for (const url of fake.urls()) {
      expect(url).toMatch(/^https:\/\/(data\.ademe\.fr\/data-fair\/api\/|api\.nbp\.pl\/api\/)/);
    }
    expect(fake.urls()).not.toContain(URLS.ademePage);
  });

  it('writes the cars with the dataset date, the dataset page as source and prices at the stored rate', async () => {
    await storeRate(4.3775);

    await catalogueStep(makeContext(sources().fetch));

    const cars = await getActiveCars();
    expect(cars).toHaveLength(489);
    expect(new Set(cars.map((car) => car.priceObservedAt))).toEqual(new Set(['2026-09-14']));
    expect(new Set(cars.map((car) => car.priceSourceUrl))).toEqual(
      new Set(['https://data.ademe.fr/datasets/ademe-car-labelling']),
    );
    expect(await getCarBySlug(GIULIA)).toMatchObject({
      make: 'Alfa Romeo',
      variant: 'Giulia 2.2 Diesel AT8',
      brandTier: 'premium',
      valueRetention: 'low',
      priceEur: 45600,
      listPricePln: 204600,
      fuelL100: 5.1,
    });
    const fuelTypes = new Set(cars.map((car) => car.fuelType));
    expect([...fuelTypes].sort()).toEqual(['diesel', 'ev', 'hybrid', 'lpg', 'petrol', 'phev']);
  });

  it('reads the date of the data from the metadata, as a UTC day', async () => {
    await storeRate(4.3775);
    const fake = sources({ dataUpdatedAt: '2026-10-01T23:30:00.000Z' });

    await catalogueStep(makeContext(fake.fetch));

    expect((await getCarBySlug(GIULIA))?.priceObservedAt).toBe('2026-10-01');
  });

  it('replaces the existing catalogue: new cars active, cars no longer in the dataset inactive', async () => {
    await storeRate(4.3775);
    await replaceCatalog(existingCars());

    const result = await catalogueStep(makeContext(sources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 489 });
    expect(await countCars(database.db)).toEqual({ all: 491, active: 489 });
    expect(await getCarBySlug('existing-one')).toBeNull();
  });

  it('reads the two recorded pages, linked by "next", as one list of rows', async () => {
    const fake = createFakeFetch({
      [URLS.ademeMetadata]: jsonReply(readRecorded('ademe/metadata.json')),
      [URLS.ademeRows]: jsonReply(readRecorded('ademe/rows-page-1.json')),
      [ademeNextUrl(6)]: jsonReply(readRecorded('ademe/rows-page-2.json')),
    });
    await storeRate(4.3775);

    const result = await catalogueStep(makeContext(fake.fetch));

    // Twelve rows are all there is, far fewer than a real dataset: collected, then refused.
    expect(fake.urls()).toEqual([URLS.ademeMetadata, URLS.ademeRows, ademeNextUrl(6)]);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/Only 12 valid rows/);
    expect(await countCars(database.db)).toEqual({ all: 0, active: 0 });
  });

  it('in a dry run reports the cars it would write and writes nothing', async () => {
    await replaceCatalog(existingCars());
    const before = await allCarRows(database.db);
    const fake = sources({}, { [TODAY_RANGE]: nbpRangeReply('2026-10-05_2026-10-11') });

    const result = await catalogueStep(makeContext(fake.fetch, { dryRun: true }));

    expect(result).toMatchObject({ ok: true, updated: 489, skipped: 70, errors: [] });
    const notes = result.notes?.join('\n') ?? '';
    expect(notes).toMatch(/dataset updated 2026-09-14/);
    expect(notes).toMatch(/cars built 489/);
    expect(notes).toMatch(/petrol 199/);
    expect(notes).toMatch(/ev 48/);
    expect(notes).toMatch(/unsupported-energy 68/);
    expect(notes).toMatch(/unknown makes: none/);
    expect(notes).toMatch(/dry run/);
    expect(await allCarRows(database.db)).toEqual(before);
  });

  it('with the time budget used up makes no request and keeps the catalogue', async () => {
    await storeRate(4.3775);
    await replaceCatalog(existingCars());
    const before = await allCarRows(database.db);
    const fake = sources();

    const result = await catalogueStep(expiredContext(fake.fetch));

    expect(fake.urls()).toEqual([]);
    await expectCatalogueUntouched(result, before);
    expect(result.errors[0].message).toMatch(/time budget/i);
  });
});

describe('catalogue step - responses it refuses', () => {
  async function refused(fake: FakeFetch) {
    await storeRate(4.3775);
    await replaceCatalog(existingCars());
    const before = await allCarRows(database.db);

    const result = await catalogueStep(makeContext(fake.fetch));

    await expectCatalogueUntouched(result, before);
    return result.errors[0].message;
  }

  /** A first page of 1000 rows whose "next" link is the given address. */
  function firstPageLinkingTo(next: string, extra: Record<string, Reply> = {}): FakeFetch {
    const rows = apiRows();
    return createFakeFetch({
      [URLS.ademeMetadata]: jsonReply(readRecorded('ademe/metadata.json')),
      [URLS.ademeRows]: jsonReply({ total: rows.length, next, results: rows.slice(0, 1000) }),
      ...extra,
    });
  }

  it('a "next" link to another host is not followed', async () => {
    const elsewhere = 'https://example.org/data-fair/api/v1/datasets/ademe-car-labelling/lines?after=1000';
    const fake = firstPageLinkingTo(elsewhere, { [elsewhere]: jsonReply({ results: apiRows().slice(1000) }) });

    const message = await refused(fake);

    expect(message).toMatch(/different host/);
    expect(fake.urls()).toEqual([URLS.ademeMetadata, URLS.ademeRows]);
  });

  it.each([
    ['a look-alike host', 'https://data.ademe.fr.example.org/data-fair/api/v1/datasets/ademe-car-labelling/lines?after=1000'],
    ['the host with another port', 'https://data.ademe.fr:8443/data-fair/api/v1/datasets/ademe-car-labelling/lines?after=1000'],
    ['the host as user name of another host', 'https://data.ademe.fr@example.org/data-fair/api/v1/lines?after=1000'],
    ['plain http', 'http://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/lines?after=1000'],
    ['a path outside the dataset API', 'https://data.ademe.fr/datasets/ademe-car-labelling?after=1000'],
    ['a local address', 'http://127.0.0.1:8080/data-fair/api/v1/lines'],
    ['a file address', 'file:///etc/passwd'],
    ['a relative address', '/data-fair/api/v1/datasets/ademe-car-labelling/lines?after=1000'],
  ])('a "next" link with %s is not followed', async (_what, next) => {
    const fake = firstPageLinkingTo(next);

    await refused(fake);

    expect(fake.urls()).toEqual([URLS.ademeMetadata, URLS.ademeRows]);
  });

  it('more than 20 pages stop the download after the twentieth', async () => {
    // Every page holds one row and links to the next one, without end.
    const routes: Record<string, Reply> = {
      [URLS.ademeMetadata]: jsonReply(readRecorded('ademe/metadata.json')),
      [URLS.ademeRows]: jsonReply({ total: 5000, next: ademeNextUrl(1), results: [apiRow()] }),
    };
    for (let page = 1; page <= 30; page += 1) {
      routes[ademeNextUrl(page)] = jsonReply({ next: ademeNextUrl(page + 1), results: [apiRow()] });
    }
    const fake = createFakeFetch(routes);

    const message = await refused(fake);

    expect(message).toMatch(/more than 20 pages/);
    expect(fake.urls()).toHaveLength(21); // the metadata and 20 pages
  });

  it('exactly 20 pages are accepted', async () => {
    await storeRate(4.3775);
    const fake = sources({ pageSize: 181 }); // 3604 rows in 20 pages

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(fake.urls()).toHaveLength(21);
    expect(result).toMatchObject({ ok: true, updated: 489, errors: [] });
  });

  it.each([
    ['larger', 3605],
    ['smaller', 3603],
    ['zero', 0],
  ])('a reported total %s than the number of rows collected', async (_what, total) => {
    const message = await refused(sources({ total }));
    expect(message).toMatch(new RegExp(`collected \\(3604\\).*total \\(${total}\\)`));
  });

  it('a first page without a total', async () => {
    const rows = apiRows();
    const fake = createFakeFetch({
      [URLS.ademeMetadata]: jsonReply(readRecorded('ademe/metadata.json')),
      [URLS.ademeRows]: jsonReply({ results: rows.slice(0, 1000) }),
    });
    expect(await refused(fake)).toMatch(/total/);
  });

  it('a last page that is missing: fewer rows than the reported total', async () => {
    const routes = ademeRoutes();
    routes[ademeNextUrl(2000)] = jsonReply({ results: apiRows().slice(2000, 3000) });
    expect(await refused(createFakeFetch(routes))).toMatch(/collected \(3000\).*total \(3604\)/);
  });

  it('a page that fails with HTTP 404', async () => {
    const routes = ademeRoutes();
    routes[ademeNextUrl(2000)] = statusReply(404);
    expect(await refused(createFakeFetch(routes))).toMatch(/HTTP 404/);
  });

  it.each([
    ['rows that are not a list', { total: 1, results: { 0: apiRow() } }],
    ['no rows field', { total: 0 }],
    ['a list instead of an object', [apiRow()]],
  ])('a page with %s', async (_what, body) => {
    const fake = createFakeFetch({
      [URLS.ademeMetadata]: jsonReply(readRecorded('ademe/metadata.json')),
      [URLS.ademeRows]: jsonReply(body),
    });
    await refused(fake);
  });

  it.each([
    ['no date', {}],
    ['a date that is not a timestamp', { dataUpdatedAt: '14/09/2026' }],
    ['a date without a time', { dataUpdatedAt: '2026-09-14' }],
    ['a date as a number', { dataUpdatedAt: 1789000000000 }],
  ])('metadata with %s stops the step before any rows are requested', async (_what, metadata) => {
    const fake = createFakeFetch({ ...ademeRoutes(), [URLS.ademeMetadata]: jsonReply(metadata) });

    await refused(fake);

    expect(fake.urls()).toEqual([URLS.ademeMetadata]);
  });

  it('metadata dated more than one day after the current time', async () => {
    const message = await refused(sources({ dataUpdatedAt: '2026-10-12T03:00:00.001Z' }));
    expect(message).toMatch(/future/);
  });

  it('metadata that fails with HTTP 404', async () => {
    const fake = createFakeFetch({ ...ademeRoutes(), [URLS.ademeMetadata]: statusReply(404) });
    expect(await refused(fake)).toMatch(/HTTP 404/);
  });
});

describe('catalogue step - invalid rows', () => {
  it('a few invalid rows are dropped and counted, and the catalogue is written', async () => {
    await storeRate(4.3775);
    // 189 of 3793 rows are invalid: 4.98 %.
    const fake = sources({ rows: [...invalidRows(189), ...apiRows()] });

    const result = await catalogueStep(makeContext(fake.fetch));

    // 70 rows skipped by the builder + 189 dropped
    expect(result).toMatchObject({ ok: true, updated: 489, skipped: 259, errors: [] });
    expect(result.notes?.join('\n')).toMatch(/rows downloaded 3793 in 4 pages, valid 3604, dropped 189/);
    expect(await countCars(database.db)).toEqual({ all: 489, active: 489 });
  });

  it('more than 5 % invalid rows fail the step without writing', async () => {
    await storeRate(4.3775);
    await replaceCatalog(existingCars());
    const before = await allCarRows(database.db);
    // 190 of 3794 rows are invalid: 5.01 %.
    const fake = sources({ rows: [...invalidRows(190), ...apiRows()] });

    const result = await catalogueStep(makeContext(fake.fetch));

    await expectCatalogueUntouched(result, before);
    expect(result.errors[0].message).toMatch(/190 of 3794 .*fail validation/);
  });

  it.each([
    ['a number as make', apiRow({ Marque: 42 })],
    ['a price as text', apiRow({ Prix_véhicule: '14400' })],
    ['null', null],
    ['a text', 'DACIA;SANDERO'],
    ['a list', ['DACIA', 'SANDERO']],
  ])('a row that is %s is dropped, not passed to the builder', async (_what, badRow) => {
    await storeRate(4.3775);
    const fake = sources({ rows: [badRow, ...apiRows()] });

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 489, skipped: 71, errors: [] });
  });

  it('rows in which the API left out the empty fields are valid', async () => {
    await storeRate(4.3775);
    const rows = apiRows();
    expect(rows.some((row) => !('Puissance_maximale' in row))).toBe(true);

    const result = await catalogueStep(makeContext(sources({ rows }).fetch));

    expect(result.notes?.join('\n')).toMatch(/valid 3604, dropped 0/);
    const cars = await getActiveCars();
    expect(cars.filter((car) => car.fuelType === 'ev')).toHaveLength(48);
  });
});

describe('catalogue step - guards against a shrinking catalogue', () => {
  it('fewer than 1000 valid rows: nothing is written, the message states the numbers', async () => {
    await storeRate(4.3775);
    await replaceCatalog(existingCars());
    const before = await allCarRows(database.db);
    const fake = sources({ rows: apiRows().slice(0, 999) });

    const result = await catalogueStep(makeContext(fake.fetch));

    await expectCatalogueUntouched(result, before);
    expect(result.errors[0].message).toMatch(/999/);
    expect(result.errors[0].message).toMatch(/1000/);
  });

  it('1000 valid rows of a full dataset pass the row guard', async () => {
    await storeRate(4.3775);
    // The first 1000 rows of the dataset build more than 200 cars.
    const fake = sources({ rows: apiRows().slice(0, 1000) });

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, errors: [] });
    expect(result.updated).toBeGreaterThanOrEqual(200);
    expect((await countCars(database.db)).active).toBe(result.updated);
  });

  it('invalid rows do not count towards the 1000', async () => {
    await storeRate(4.3775);
    const fake = sources({ rows: [...apiRows().slice(0, 999), ...invalidRows(40)] });

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/Only 999 valid rows/);
    expect(await countCars(database.db)).toEqual({ all: 0, active: 0 });
  });

  it('fewer than 200 cars built: nothing is written, the message states the numbers', async () => {
    await storeRate(4.3775);
    await replaceCatalog(existingCars());
    const before = await allCarRows(database.db);
    // 1200 valid rows that are 199 different cars (199 power values).
    const rows = Array.from({ length: 1200 }, (_, index) =>
      apiRow({ Puissance_maximale: 30 + (index % 199), Prix_véhicule: 14000 + index }),
    );

    const result = await catalogueStep(makeContext(sources({ rows }).fetch));

    await expectCatalogueUntouched(result, before);
    expect(result.errors[0].message).toMatch(/Only 199 cars built/);
    expect(result.errors[0].message).toMatch(/200/);
  });

  it('exactly 200 cars built pass the car guard', async () => {
    await storeRate(4.3775);
    const rows = Array.from({ length: 1200 }, (_, index) =>
      apiRow({ Puissance_maximale: 30 + (index % 200), Prix_véhicule: 14000 + index }),
    );

    const result = await catalogueStep(makeContext(sources({ rows }).fetch));

    expect(result).toMatchObject({ ok: true, updated: 200, errors: [] });
    expect(await countCars(database.db)).toEqual({ all: 200, active: 200 });
  });

  it('fewer cars than half of the active catalogue: nothing is written, the active cars stay', async () => {
    await storeRate(4.3775);
    // 489 cars would be built; half of 979 active cars is 489.5.
    await replaceCatalog(manyExistingCars(979));
    const before = await allCarRows(database.db);

    const result = await catalogueStep(makeContext(sources().fetch));

    await expectCatalogueUntouched(result, before);
    expect(result.errors[0].message).toMatch(/489/);
    expect(result.errors[0].message).toMatch(/979/);
    expect(await countCars(database.db)).toEqual({ all: 979, active: 979 });
  });

  it('exactly half of the active catalogue is enough', async () => {
    await storeRate(4.3775);
    await replaceCatalog(manyExistingCars(978));

    const result = await catalogueStep(makeContext(sources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 489, errors: [] });
    expect(await countCars(database.db)).toEqual({ all: 1467, active: 489 });
  });

  it('inactive cars do not count as the active catalogue', async () => {
    await storeRate(4.3775);
    await replaceCatalog(manyExistingCars(1200));
    await replaceCatalog(manyExistingCars(2));

    const result = await catalogueStep(makeContext(sources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 489, errors: [] });
    expect((await countCars(database.db)).active).toBe(489);
  });

  it('in a dry run the guards still apply', async () => {
    const fake = sources(
      { rows: apiRows().slice(0, 999) },
      { [TODAY_RANGE]: nbpRangeReply('2026-10-05_2026-10-11') },
    );

    const result = await catalogueStep(makeContext(fake.fetch, { dryRun: true }));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors[0].message).toMatch(/Only 999 valid rows/);
  });
});

describe('catalogue step - exchange rate', () => {
  it('uses the stored rate and does not ask the bank', async () => {
    await storeRate(4.4);
    const fake = sources();

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 489 });
    expect(fake.urls().filter((url) => url.includes('nbp.pl'))).toEqual([]);
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(205700);
    expect(result.notes?.join('\n')).toMatch(/EUR\/PLN 4\.4 \(database, 2026-10-09\)/);
  });

  it('without a stored rate fetches the rate of the current day', async () => {
    const fake = sources({}, { [TODAY_RANGE]: nbpRangeReply('2026-10-05_2026-10-11') });

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 489, errors: [] });
    expect(fake.urls()).toContain(
      'https://api.nbp.pl/api/exchangerates/rates/a/eur/2026-10-05/2026-10-11/?format=json',
    );
    // 4.3775, published on Friday 2026-10-09
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(204600);
  });

  it('does not build prices on the stored sample rate: it fetches the real one', async () => {
    await seedPrices(samplePrice('eur_pln', 4.3, '2026-10-01'));
    const fake = sources({}, { [TODAY_RANGE]: nbpRangeReply('2026-10-05_2026-10-11') });

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 489 });
    expect(fake.urls()).toContain(TODAY_RANGE);
    // At the sample rate 4.30 the price would be 201 000.
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(204600);
  });

  it('fails without writing when there is no stored rate and the bank gives none', async () => {
    await replaceCatalog(existingCars());
    const before = await allCarRows(database.db);
    const fake = sources({}, { [TODAY_RANGE]: statusReply(404) });

    const result = await catalogueStep(makeContext(fake.fetch));

    await expectCatalogueUntouched(result, before);
    expect(result.errors[0].message).toMatch(/HTTP 404/);
  });

  it('fails without writing when the fetched rate is out of range', async () => {
    await replaceCatalog(existingCars());
    const before = await allCarRows(database.db);
    const fake = sources({}, { [TODAY_RANGE]: jsonReply(nbpBody([{ effectiveDate: '2026-10-09', mid: 43.775 }])) });

    const result = await catalogueStep(makeContext(fake.fetch));

    await expectCatalogueUntouched(result, before);
  });

  it('in a dry run fetches the rate even when one is stored', async () => {
    await storeRate(4.4);
    const fake = sources({}, { [TODAY_RANGE]: nbpRangeReply('2026-10-05_2026-10-11') });

    const result = await catalogueStep(makeContext(fake.fetch, { dryRun: true }));

    expect(fake.urls()).toContain(TODAY_RANGE);
    expect(result.notes?.join('\n')).toMatch(/EUR\/PLN 4\.3775/);
    expect(await countCars(database.db)).toEqual({ all: 0, active: 0 });
  });
});

describe('catalogue step - change detection', () => {
  /** Writes the catalogue once at the rate 4.3775 and returns the stored rows. */
  async function writtenOnce() {
    await storeRate(4.3775);
    const first = await catalogueStep(makeContext(sources().fetch));
    expect(first).toMatchObject({ ok: true, updated: 489 });
    return allCarRows(database.db);
  }

  it('same dataset date and same rate: nothing is written, every car counts as skipped', async () => {
    const before = await writtenOnce();

    const result = await catalogueStep(makeContext(sources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 489, errors: [] });
    expect(result.notes?.join('\n')).toMatch(/unchanged/);
    expect(await allCarRows(database.db)).toEqual(before);
  });

  it('same dataset date and a rate that moved by less than 0.5 %: nothing is written', async () => {
    const before = await writtenOnce();
    // 4.3775 -> 4.39 is +0.29 %; at 4.39 the reference car would cost 205 200.
    await storeRate(4.39, '2026-10-12');

    const result = await catalogueStep(makeContext(sources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 489, errors: [] });
    expect(await allCarRows(database.db)).toEqual(before);
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(204600);
  });

  it('same dataset date and a rate that fell by less than 0.5 %: nothing is written', async () => {
    const before = await writtenOnce();
    // 4.3775 -> 4.36 is -0.40 %
    await storeRate(4.36, '2026-10-12');

    const result = await catalogueStep(makeContext(sources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 489 });
    expect(await allCarRows(database.db)).toEqual(before);
  });

  it('same dataset date and a rate that moved by more than 0.5 %: the prices are rewritten', async () => {
    await writtenOnce();
    // 4.3775 -> 4.41 is +0.74 %
    await storeRate(4.41, '2026-10-12');

    const result = await catalogueStep(makeContext(sources().fetch));

    expect(result).toMatchObject({ ok: true, skipped: 70, errors: [] });
    expect(result.updated).toBeGreaterThan(400);
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(206100);
    expect(await countCars(database.db)).toEqual({ all: 489, active: 489 });
  });

  it('same dataset date and a rate that fell by more than 0.5 %: the prices are rewritten', async () => {
    await writtenOnce();
    // 4.3775 -> 4.35 is -0.63 %; 45600 * 4.35 * 1.025 = 203 319 -> 203 300
    await storeRate(4.35, '2026-10-12');

    const result = await catalogueStep(makeContext(sources().fetch));

    expect(result.updated).toBeGreaterThan(400);
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(203300);
  });

  it('a new dataset date with the same rate: the catalogue is rewritten with the new date', async () => {
    await writtenOnce();

    const result = await catalogueStep(makeContext(sources({ dataUpdatedAt: '2026-10-08T23:00:00.000Z' }).fetch));

    expect(result).toMatchObject({ ok: true, updated: 489, skipped: 70, errors: [] });
    const cars = await getActiveCars();
    expect(new Set(cars.map((car) => car.priceObservedAt))).toEqual(new Set(['2026-10-08']));
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(204600);
  });

  it('the sample catalogue (rate 4.30, same dataset date) is replaced at the real rate', async () => {
    // 4.30 -> 4.3775 is +1.8 %
    await bootstrapFromFixtures(database.db);
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(201000);
    const fake = sources({}, { [TODAY_RANGE]: nbpRangeReply('2026-10-05_2026-10-11') });

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, errors: [] });
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(204600);
    expect(await countCars(database.db)).toEqual({ all: 489, active: 489 });
  });

  it('an empty catalogue is always written', async () => {
    await storeRate(4.3775);
    const result = await catalogueStep(makeContext(sources().fetch));
    expect(result.updated).toBe(489);
  });

  it('in a dry run an unchanged catalogue is reported as unchanged', async () => {
    const before = await writtenOnce();
    const fake = sources({}, { [TODAY_RANGE]: nbpRangeReply('2026-10-05_2026-10-11') });

    const result = await catalogueStep(makeContext(fake.fetch, { dryRun: true }));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 489 });
    expect(await allCarRows(database.db)).toEqual(before);
  });
});

describe('catalogue step - makes missing from the brand data', () => {
  it.each([
    ['empty', ''],
    ['spaces only', '   '],
    ['a tab', '\t'],
  ])('a row whose make is %s produces no error entry', async (_what, make) => {
    await storeRate(4.3775);
    const fake = sources({ rows: [...apiRows(), apiRow({ Marque: make })] });

    const result = await catalogueStep(makeContext(fake.fetch));

    // The row is skipped by the builder (71 instead of 70) and is not reported as an unknown make.
    expect(result).toMatchObject({ ok: true, updated: 489, skipped: 71, errors: [] });
    expect(result.notes?.join('\n')).toMatch(/unknown makes: none/);
    expect(result.notes?.join('\n')).toMatch(/missing-name 1/);
  });

  it('a make that is not in the brand data produces one informational entry and the step stays ok', async () => {
    await storeRate(4.3775);
    const fake = sources({
      rows: [
        ...apiRows(),
        apiRow({ Marque: 'ZEEKR', Modèle: '7X', Description_Commerciale: '7X Core' }),
        apiRow({ Marque: 'ZEEKR', Modèle: 'X', Description_Commerciale: 'X Core' }),
      ],
    });

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 491, skipped: 70 });
    expect(result.errors).toEqual([{ item: 'ZEEKR', message: expect.stringMatching(/brands\.json/) }]);
    expect(await getCarBySlug('zeekr-7x-petrol-manual-91km')).toMatchObject({
      make: 'Zeekr',
      brandTier: 'mainstream',
      valueRetention: 'average',
    });
  });

  it('an unknown make and an empty make together produce one entry, for the unknown make', async () => {
    await storeRate(4.3775);
    const fake = sources({
      rows: [
        ...apiRows(),
        apiRow({ Marque: '' }),
        apiRow({ Marque: 'AIWAYS', Modèle: 'U5', Description_Commerciale: 'U5' }),
        apiRow({ Marque: 'ZEEKR', Modèle: 'X', Description_Commerciale: 'X Core' }),
      ],
    });

    const result = await catalogueStep(makeContext(fake.fetch));

    expect(result.ok).toBe(true);
    expect(result.errors.map((error) => error.item)).toEqual(['AIWAYS', 'ZEEKR']);
    expect(result.updated).toBe(491);
  });

  it('an unknown make is reported in a dry run as well', async () => {
    const fake = sources(
      { rows: [...apiRows(), apiRow({ Marque: 'ZEEKR', Modèle: 'X', Description_Commerciale: 'X Core' })] },
      { [TODAY_RANGE]: nbpRangeReply('2026-10-05_2026-10-11') },
    );

    const result = await catalogueStep(makeContext(fake.fetch, { dryRun: true }));

    expect(result).toMatchObject({ ok: true, updated: 490 });
    expect(result.errors.map((error) => error.item)).toEqual(['ZEEKR']);
    expect(await countCars(database.db)).toEqual({ all: 0, active: 0 });
  });
});
