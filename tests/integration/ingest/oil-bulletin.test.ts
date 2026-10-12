import { describe, expect, it } from 'vitest';
import { OIL_BULLETIN } from '@/config/sources';
import { oilBulletinStep } from '@/ingest/sources/oil-bulletin';
import { expiredContext, makeContext } from '../helpers/clock';
import { allPriceRows, realPrice, samplePrice, seedPrices, storedPrice, setupTestDatabase } from '../helpers/database';
import { bytesReply, createFakeFetch, jsonReply, statusReply, textReply, type FakeFetch } from '../helpers/fake-fetch';
import {
  bulletinReply,
  nbpBody,
  nbpRangeReply,
  recordedBulletinReply,
  URLS,
  XLSX_TYPE,
  type BulletinOptions,
} from '../helpers/sources';

// Fuel price step. The clock stands at 2026-10-11 03:00 UTC.
//
// Recorded file: bulletin of 2026-10-05, Poland in EUR per 1000 litres:
//   Euro-super 95 1519.5933, automotive gas oil 1764.4553, LPG 740.0568.
// Recorded EUR rate of 2026-10-05: 4.3855. Per litre in PLN, to four decimals:
//   petrol 1519.5933 * 4.3855 / 1000 = 6.6642
//   diesel 1764.4553 * 4.3855 / 1000 = 7.7380
//   LPG     740.0568 * 4.3855 / 1000 = 3.2455

const database = setupTestDatabase();

const RANGE_URL = URLS.nbpRange('2026-09-29', '2026-10-05');
const SOURCE = 'European Commission, Weekly Oil Bulletin';
const PAGE = 'https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en';
const FUELS = ['petrol', 'diesel', 'lpg'] as const;

function recordedSources(): FakeFetch {
  return createFakeFetch({
    [URLS.oilBulletinFile]: recordedBulletinReply(),
    [RANGE_URL]: nbpRangeReply('2026-09-29_2026-10-05'),
  });
}

/** A built workbook dated 2026-10-05 and a EUR rate of exactly 4.00 for that day. */
async function builtSources(options: BulletinOptions = {}): Promise<FakeFetch> {
  return createFakeFetch({
    [URLS.oilBulletinFile]: await bulletinReply(options),
    [RANGE_URL]: jsonReply(nbpBody([{ effectiveDate: '2026-10-05', mid: 4 }])),
  });
}

async function fuelRows() {
  return (await allPriceRows(database.db)).filter((row) => row.key !== 'eur_pln' && row.key !== 'electricity');
}

const errorItems = (result: { errors: { item: string }[] }) => result.errors.map((error) => error.item).sort();

describe('fuel price step - recorded file', () => {
  it('stores petrol, diesel and LPG per litre in PLN with the bulletin date', async () => {
    const result = await oilBulletinStep(makeContext(recordedSources().fetch));

    expect(result).toMatchObject({ source: 'oil-bulletin', ok: true, updated: 3, skipped: 0, errors: [] });
    expect(await storedPrice(database.db, 'petrol')).toEqual({
      key: 'petrol',
      pricePln: 6.6642,
      observedAt: '2026-10-05',
      source: SOURCE,
      sourceUrl: PAGE,
    });
    expect(await storedPrice(database.db, 'diesel')).toEqual({
      key: 'diesel',
      pricePln: 7.738,
      observedAt: '2026-10-05',
      source: SOURCE,
      sourceUrl: PAGE,
    });
    expect(await storedPrice(database.db, 'lpg')).toEqual({
      key: 'lpg',
      pricePln: 3.2455,
      observedAt: '2026-10-05',
      source: SOURCE,
      sourceUrl: PAGE,
    });
  });

  it('gives prices inside 2.00 to 15.00 PLN per litre, with LPG below petrol', async () => {
    await oilBulletinStep(makeContext(recordedSources().fetch));

    const rows = await fuelRows();
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(Number(row.pricePln)).toBeGreaterThanOrEqual(2);
      expect(Number(row.pricePln)).toBeLessThanOrEqual(15);
    }
    const price = Object.fromEntries(rows.map((row) => [row.key, Number(row.pricePln)]));
    expect(price.lpg).toBeLessThan(price.petrol);
  });

  it('requests the configured file and the EUR rate of the bulletin day, and no web page', async () => {
    const fake = recordedSources();

    await oilBulletinStep(makeContext(fake.fetch));

    expect(fake.urls()).toEqual([
      OIL_BULLETIN.latestPricesUrl,
      'https://api.nbp.pl/api/exchangerates/rates/a/eur/2026-09-29/2026-10-05/?format=json',
    ]);
    expect(fake.urls()).not.toContain(PAGE);
    expect(fake.urls()).not.toContain(OIL_BULLETIN.pageUrl);
    expect(fake.requests[0].headers.accept).toBe(XLSX_TYPE);
  });

  it('the configured file address names a document, not a date and not a web page', () => {
    expect(OIL_BULLETIN.latestPricesUrl).toBe(URLS.oilBulletinFile);
    expect(OIL_BULLETIN.latestPricesUrl).toMatch(/^https:\/\/energy\.ec\.europa\.eu\/document\/download\//);
    expect(OIL_BULLETIN.latestPricesUrl).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{2}[-_.]\d{2}[-_.]\d{4}/);
    expect(OIL_BULLETIN.latestPricesUrl).not.toBe(OIL_BULLETIN.pageUrl);
  });

  it('writes only the three fuel rows', async () => {
    await oilBulletinStep(makeContext(recordedSources().fetch));
    expect((await allPriceRows(database.db)).map((row) => row.key)).toEqual(['diesel', 'lpg', 'petrol']);
  });

  it('skips all three prices when the stored ones have the same date, without asking for the EUR rate', async () => {
    const stored = [
      realPrice('petrol', 6.11, '2026-10-05'),
      realPrice('diesel', 6.22, '2026-10-05'),
      realPrice('lpg', 3.33, '2026-10-05'),
    ];
    await seedPrices(...stored);
    const fake = recordedSources();

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 3, errors: [] });
    expect(fake.urls()).toEqual([URLS.oilBulletinFile]);
    for (const price of stored) expect(await storedPrice(database.db, price.key)).toEqual(price);
  });

  it('skips all three prices when the stored ones are newer', async () => {
    const stored = [
      realPrice('petrol', 6.11, '2026-10-12'),
      realPrice('diesel', 6.22, '2026-10-12'),
      realPrice('lpg', 3.33, '2026-10-12'),
    ];
    await seedPrices(...stored);

    const result = await oilBulletinStep(makeContext(recordedSources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 3, errors: [] });
    for (const price of stored) expect(await storedPrice(database.db, price.key)).toEqual(price);
  });

  it('replaces stored prices that are older', async () => {
    await seedPrices(
      realPrice('petrol', 6.11, '2026-09-28'),
      realPrice('diesel', 6.22, '2026-09-28'),
      realPrice('lpg', 3.33, '2026-09-28'),
    );

    const result = await oilBulletinStep(makeContext(recordedSources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 3, skipped: 0, errors: [] });
    expect((await fuelRows()).map((row) => [row.key, Number(row.pricePln), row.observedAt, row.source])).toEqual([
      ['diesel', 7.738, '2026-10-05', SOURCE],
      ['lpg', 3.2455, '2026-10-05', SOURCE],
      ['petrol', 6.6642, '2026-10-05', SOURCE],
    ]);
  });

  it('decides per fuel: an older row is replaced, a same-day row is kept', async () => {
    const keptDiesel = realPrice('diesel', 6.22, '2026-10-05');
    await seedPrices(realPrice('petrol', 6.11, '2026-09-28'), keptDiesel);

    const result = await oilBulletinStep(makeContext(recordedSources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 2, skipped: 1, errors: [] });
    expect(await storedPrice(database.db, 'petrol')).toMatchObject({ pricePln: 6.6642, observedAt: '2026-10-05' });
    expect(await storedPrice(database.db, 'diesel')).toEqual(keptDiesel);
    expect(await storedPrice(database.db, 'lpg')).toMatchObject({ pricePln: 3.2455, observedAt: '2026-10-05' });
  });

  it('replaces stored sample prices even though their date is later than the bulletin', async () => {
    await seedPrices(
      samplePrice('petrol', 6.5, '2026-12-31'),
      samplePrice('diesel', 6.6, '2026-12-31'),
      samplePrice('lpg', 3.1, '2026-12-31'),
    );

    const result = await oilBulletinStep(makeContext(recordedSources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 3, skipped: 0, errors: [] });
    expect((await fuelRows()).map((row) => [row.key, Number(row.pricePln), row.observedAt, row.source])).toEqual([
      ['diesel', 7.738, '2026-10-05', SOURCE],
      ['lpg', 3.2455, '2026-10-05', SOURCE],
      ['petrol', 6.6642, '2026-10-05', SOURCE],
    ]);
  });

  it('replaces a single sample price among real same-day prices and keeps the real ones', async () => {
    const petrol = realPrice('petrol', 6.11, '2026-10-05');
    const lpg = realPrice('lpg', 3.33, '2026-10-05');
    await seedPrices(petrol, samplePrice('diesel', 6.6, '2026-12-31'), lpg);

    const result = await oilBulletinStep(makeContext(recordedSources().fetch));

    expect(result).toMatchObject({ ok: true, updated: 1, skipped: 2, errors: [] });
    expect(await storedPrice(database.db, 'petrol')).toEqual(petrol);
    expect(await storedPrice(database.db, 'lpg')).toEqual(lpg);
    expect(await storedPrice(database.db, 'diesel')).toMatchObject({ pricePln: 7.738, observedAt: '2026-10-05', source: SOURCE });
  });

  it('a second run right after the first one skips all three prices', async () => {
    await oilBulletinStep(makeContext(recordedSources().fetch));
    const before = await allPriceRows(database.db);

    const second = await oilBulletinStep(makeContext(recordedSources().fetch));

    expect(second).toMatchObject({ ok: true, updated: 0, skipped: 3, errors: [] });
    expect(await allPriceRows(database.db)).toEqual(before);
  });

  it('in a dry run reports the three prices and writes nothing', async () => {
    const result = await oilBulletinStep(makeContext(recordedSources().fetch, { dryRun: true }));

    expect(result).toMatchObject({ ok: true, updated: 3, skipped: 0, errors: [] });
    const notes = result.notes?.join('\n') ?? '';
    expect(notes).toMatch(/petrol 6\.6642 PLN\/l/);
    expect(notes).toMatch(/diesel 7\.738 PLN\/l/);
    expect(notes).toMatch(/lpg 3\.2455 PLN\/l/);
    expect(notes).toMatch(/2026-10-05/);
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('in a dry run over sample prices reports the replacement and keeps the sample prices', async () => {
    const stored = FUELS.map((key) => samplePrice(key, 5.5, '2026-10-01'));
    await seedPrices(...stored);

    const result = await oilBulletinStep(makeContext(recordedSources().fetch, { dryRun: true }));

    expect(result).toMatchObject({ ok: true, updated: 3, skipped: 0, errors: [] });
    expect(result.notes?.filter((note) => /replaces a fixture value/.test(note))).toHaveLength(3);
    for (const price of stored) expect(await storedPrice(database.db, price.key)).toEqual(price);
  });

  it('with the time budget used up makes no request and reports an error', async () => {
    const stored = realPrice('petrol', 6.11, '2026-09-28');
    await seedPrices(stored);
    const fake = recordedSources();

    const result = await oilBulletinStep(expiredContext(fake.fetch));

    expect(fake.urls()).toEqual([]);
    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/time budget/i);
    expect(await allPriceRows(database.db)).toHaveLength(1);
    expect(await storedPrice(database.db, 'petrol')).toEqual(stored);
  });
});

describe('fuel price step - conversion and validation', () => {
  // Built workbooks; the EUR rate of the bulletin day is exactly 4.00.

  it('converts EUR per 1000 litres into PLN per litre with the EUR rate of the bulletin day', async () => {
    const fake = await builtSources({ petrol: 1500, diesel: 1700, lpg: 750 });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 3, errors: [] });
    // 1500 * 4 / 1000, 1700 * 4 / 1000, 750 * 4 / 1000
    expect((await storedPrice(database.db, 'petrol'))?.pricePln).toBe(6);
    expect((await storedPrice(database.db, 'diesel'))?.pricePln).toBe(6.8);
    expect((await storedPrice(database.db, 'lpg'))?.pricePln).toBe(3);
  });

  it('reads the bulletin date from the file', async () => {
    const fake = createFakeFetch({
      [URLS.oilBulletinFile]: await bulletinReply({ date: new Date('2026-09-21T00:00:00Z') }),
      [URLS.nbpRange('2026-09-15', '2026-09-21')]: jsonReply(nbpBody([{ effectiveDate: '2026-09-21', mid: 4 }])),
    });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 3 });
    expect((await fuelRows()).map((row) => row.observedAt)).toEqual(['2026-09-21', '2026-09-21', '2026-09-21']);
    expect(fake.urls()[1]).toBe('https://api.nbp.pl/api/exchangerates/rates/a/eur/2026-09-15/2026-09-21/?format=json');
  });

  it('replaces sample prices dated after the bulletin (bulletin 2026-09-21, sample data 2026-10-01)', async () => {
    await seedPrices(...FUELS.map((key) => samplePrice(key, 5.5, '2026-10-01')));
    const routes = async () =>
      createFakeFetch({
        [URLS.oilBulletinFile]: await bulletinReply({ date: new Date('2026-09-21T00:00:00Z') }),
        [URLS.nbpRange('2026-09-15', '2026-09-21')]: jsonReply(nbpBody([{ effectiveDate: '2026-09-21', mid: 4 }])),
      });

    const first = await oilBulletinStep(makeContext((await routes()).fetch));
    expect(first).toMatchObject({ ok: true, updated: 3, skipped: 0, errors: [] });
    expect((await fuelRows()).map((row) => [row.key, Number(row.pricePln), row.observedAt, row.source])).toEqual([
      ['diesel', 6.8, '2026-09-21', SOURCE],
      ['lpg', 3, '2026-09-21', SOURCE],
      ['petrol', 6, '2026-09-21', SOURCE],
    ]);

    const second = await oilBulletinStep(makeContext((await routes()).fetch));
    expect(second).toMatchObject({ ok: true, updated: 0, skipped: 3, errors: [] });
  });

  it('petrol out of range: neither petrol nor LPG is written, both are reported, diesel is written', async () => {
    // 400 * 4 / 1000 = 1.60 PLN per litre, below 2.00
    const fake = await builtSources({ petrol: 400, diesel: 1700, lpg: 750 });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 1, skipped: 0 });
    expect(errorItems(result)).toEqual(['lpg', 'petrol']);
    expect(result.errors.find((error) => error.item === 'petrol')?.message).toMatch(/1\.6.*outside the valid range/);
    expect(await storedPrice(database.db, 'petrol')).toBeNull();
    expect(await storedPrice(database.db, 'lpg')).toBeNull();
    expect((await storedPrice(database.db, 'diesel'))?.pricePln).toBe(6.8);
  });

  it('petrol above 15.00 PLN per litre is rejected the same way', async () => {
    // 3800 * 4 / 1000 = 15.20
    const fake = await builtSources({ petrol: 3800 });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(errorItems(result)).toEqual(['lpg', 'petrol']);
    expect((await fuelRows()).map((row) => row.key)).toEqual(['diesel']);
  });

  it('diesel out of range: only diesel is left out and reported', async () => {
    const fake = await builtSources({ diesel: 400 });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 2 });
    expect(errorItems(result)).toEqual(['diesel']);
    expect((await fuelRows()).map((row) => row.key)).toEqual(['lpg', 'petrol']);
  });

  it('LPG out of range: only LPG is left out and reported', async () => {
    // 450 * 4 / 1000 = 1.80
    const fake = await builtSources({ lpg: 450 });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 2 });
    expect(errorItems(result)).toEqual(['lpg']);
    expect((await fuelRows()).map((row) => row.key)).toEqual(['diesel', 'petrol']);
  });

  it.each([
    ['equal to', 1500],
    ['above', 1600],
  ])('LPG %s petrol is not written and is reported; petrol and diesel are written', async (_what, lpg) => {
    const fake = await builtSources({ petrol: 1500, diesel: 1700, lpg });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 2, skipped: 0 });
    expect(result.errors).toEqual([{ item: 'lpg', message: expect.stringMatching(/not lower than petrol/) }]);
    expect(await storedPrice(database.db, 'lpg')).toBeNull();
    expect((await storedPrice(database.db, 'petrol'))?.pricePln).toBe(6);
    expect((await storedPrice(database.db, 'diesel'))?.pricePln).toBe(6.8);
  });

  it('prices at the edges of the range, 2.00 and 15.00 PLN per litre, are accepted', async () => {
    // 3750 * 4 / 1000 = 15.00; 500 * 4 / 1000 = 2.00
    const fake = await builtSources({ petrol: 3750, diesel: 3750, lpg: 500 });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 3, errors: [] });
    expect((await storedPrice(database.db, 'petrol'))?.pricePln).toBe(15);
    expect((await storedPrice(database.db, 'lpg'))?.pricePln).toBe(2);
  });

  it('all three prices invalid: nothing is written, the stored prices stay, the step fails', async () => {
    const stored = FUELS.map((key) => realPrice(key, 5.5, '2026-09-28'));
    await seedPrices(...stored);
    const fake = await builtSources({ petrol: 100, diesel: 100, lpg: 50 });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(errorItems(result)).toEqual(['diesel', 'lpg', 'petrol']);
    for (const price of stored) expect(await storedPrice(database.db, price.key)).toEqual(price);
  });

  it('an empty price cell for Poland is reported for that fuel only', async () => {
    const fake = await builtSources({ lpg: null });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 2 });
    expect(errorItems(result)).toEqual(['lpg']);
    expect((await fuelRows()).map((row) => row.key)).toEqual(['diesel', 'petrol']);
  });

  it('an out-of-range EUR rate for the bulletin day stops the step without writing', async () => {
    const fake = createFakeFetch({
      [URLS.oilBulletinFile]: await bulletinReply(),
      [RANGE_URL]: jsonReply(nbpBody([{ effectiveDate: '2026-10-05', mid: 40 }])),
    });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toHaveLength(1);
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('no EUR rate for the bulletin day stops the step without writing', async () => {
    const fake = createFakeFetch({
      [URLS.oilBulletinFile]: await bulletinReply(),
      [RANGE_URL]: statusReply(404),
    });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors[0].message).toMatch(/HTTP 404/);
    expect(await allPriceRows(database.db)).toEqual([]);
  });
});

describe('fuel price step - files it cannot use', () => {
  async function runWith(options: BulletinOptions) {
    const stored = FUELS.map((key) => realPrice(key, 5.5, '2026-09-28'));
    await seedPrices(...stored);
    const fake = await builtSources(options);

    const result = await oilBulletinStep(makeContext(fake.fetch));

    // Whatever is wrong with the file, the stored prices stay as they were.
    for (const price of stored) expect(await storedPrice(database.db, price.key)).toEqual(price);
    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toHaveLength(1);
    return { message: result.errors[0].message, urls: fake.urls() };
  }

  it('a bulletin dated more than one day after the current time', async () => {
    const { message } = await runWith({ date: new Date('2026-10-13T00:00:00Z') });
    expect(message).toMatch(/future/);
  });

  it('prices in a currency other than EUR', async () => {
    const { message, urls } = await runWith({ currency: 'in PLN' });
    expect(message).toMatch(/EUR/);
    expect(urls).toEqual([URLS.oilBulletinFile]);
  });

  it('a unit other than 1000 litres', async () => {
    const { message } = await runWith({ units: { diesel: 't' } });
    expect(message).toMatch(/unit/i);
  });

  it('no row for Poland', async () => {
    const { message } = await runWith({ country: null });
    expect(message).toMatch(/poland/i);
  });

  it('no LPG column', async () => {
    const { message } = await runWith({ headers: { lpg: null } });
    expect(message).toMatch(/lpg/i);
  });

  it('no petrol column', async () => {
    await runWith({ headers: { petrol: 'Premium unleaded' } });
  });

  it('two diesel columns', async () => {
    const { message } = await runWith({ headers: { lpg: 'Automotive gas oil (bis)' } });
    expect(message).toMatch(/diesel/i);
  });

  it('a date cell that holds text', async () => {
    const { message } = await runWith({ date: 'last Monday' });
    expect(message).toMatch(/date/i);
  });

  it('an empty date cell', async () => {
    const { message } = await runWith({ date: null });
    expect(message).toMatch(/date/i);
  });

  it.each([
    ['a web page', textReply('<!doctype html><html><body>Weekly Oil Bulletin</body></html>', 200, 'text/html')],
    ['random bytes', bytesReply(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), XLSX_TYPE)],
    ['an empty body', bytesReply(new Uint8Array(), XLSX_TYPE)],
  ])('%s instead of a workbook', async (_what, reply) => {
    const stored = realPrice('petrol', 5.5, '2026-09-28');
    await seedPrices(stored);
    const fake = createFakeFetch({ [URLS.oilBulletinFile]: reply });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toHaveLength(1);
    expect(fake.urls()).toEqual([URLS.oilBulletinFile]);
    expect(await allPriceRows(database.db)).toHaveLength(1);
    expect(await storedPrice(database.db, 'petrol')).toEqual(stored);
  });

  it('HTTP 404 for the file', async () => {
    const fake = createFakeFetch({ [URLS.oilBulletinFile]: statusReply(404) });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors[0].message).toMatch(/HTTP 404/);
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('a file larger than 10 MB', async () => {
    const fake = createFakeFetch({ [URLS.oilBulletinFile]: bytesReply(new Uint8Array(10_000_001), XLSX_TYPE) });

    const result = await oilBulletinStep(makeContext(fake.fetch));

    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/too large/);
    expect(await allPriceRows(database.db)).toEqual([]);
  });
});
