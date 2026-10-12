import { afterEach, describe, expect, it, vi } from 'vitest';
import { exchangeRateStep, getEurRateOn } from '@/ingest/sources/nbp';
import { expiredContext, makeContext } from '../helpers/clock';
import { allPriceRows, realPrice, samplePrice, seedPrices, storedPrice, setupTestDatabase } from '../helpers/database';
import { createFakeFetch, jsonReply, statusReply, textReply } from '../helpers/fake-fetch';
import { nbpBody, nbpCurrentReply, nbpRangeReply, URLS } from '../helpers/sources';

// Exchange rate step. The clock stands at 2026-10-11 03:00 UTC.
// Recorded current rate: 4.3775, published on 2026-10-09.

const database = setupTestDatabase();

const currentRate = (effectiveDate: string, mid: number) =>
  createFakeFetch({ [URLS.nbpCurrent]: jsonReply(nbpBody([{ effectiveDate, mid }])) });

describe('exchange rate step', () => {
  it('stores the current rate with the day it was published', async () => {
    const fake = createFakeFetch({ [URLS.nbpCurrent]: nbpCurrentReply() });

    const result = await exchangeRateStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ source: 'exchange-rate', ok: true, updated: 1, skipped: 0, errors: [] });
    expect(await storedPrice(database.db, 'eur_pln')).toEqual({
      key: 'eur_pln',
      pricePln: 4.3775,
      observedAt: '2026-10-09',
      source: 'Narodowy Bank Polski, tabela A',
      sourceUrl: 'https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json',
    });
  });

  it('makes one request, to the rate address, and names the application in the User-Agent', async () => {
    const fake = createFakeFetch({ [URLS.nbpCurrent]: nbpCurrentReply() });

    await exchangeRateStep(makeContext(fake.fetch));

    expect(fake.urls()).toEqual(['https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json']);
    expect(fake.requests[0].headers['user-agent']).toMatch(/^WheelWise\/1\.0 \(\+https?:\/\/.+\/en\/methodology\)$/);
  });

  it('writes only the exchange rate row', async () => {
    const fake = createFakeFetch({ [URLS.nbpCurrent]: nbpCurrentReply() });
    await exchangeRateStep(makeContext(fake.fetch));
    expect((await allPriceRows(database.db)).map((row) => row.key)).toEqual(['eur_pln']);
  });

  it.each([2.99, 7.01, 0, -4.3, 43.775])('rejects the rate %f, outside 3.00 to 7.00, and writes nothing', async (mid) => {
    const stored = realPrice('eur_pln', 4.25, '2026-10-01');
    await seedPrices(stored);

    const result = await exchangeRateStep(makeContext(currentRate('2026-10-09', mid).fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].item).toBe('eur_pln');
    expect(result.errors[0].message).toMatch(/outside the valid range/);
    expect(await storedPrice(database.db, 'eur_pln')).toEqual(stored);
  });

  it.each([3, 7])('accepts the rate %f at the edge of the range', async (mid) => {
    const result = await exchangeRateStep(makeContext(currentRate('2026-10-09', mid).fetch));
    expect(result).toMatchObject({ ok: true, updated: 1, errors: [] });
    expect((await storedPrice(database.db, 'eur_pln'))?.pricePln).toBe(mid);
  });

  it('skips a rate of the same day as the stored one', async () => {
    const stored = realPrice('eur_pln', 4.1111, '2026-10-09');
    await seedPrices(stored);
    const fake = createFakeFetch({ [URLS.nbpCurrent]: nbpCurrentReply() });

    const result = await exchangeRateStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 1, errors: [] });
    expect(await storedPrice(database.db, 'eur_pln')).toEqual(stored);
  });

  it('skips a rate that is older than the stored one', async () => {
    const stored = realPrice('eur_pln', 4.1111, '2026-10-10');
    await seedPrices(stored);
    const fake = createFakeFetch({ [URLS.nbpCurrent]: nbpCurrentReply() });

    const result = await exchangeRateStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 1, errors: [] });
    expect(await storedPrice(database.db, 'eur_pln')).toEqual(stored);
  });

  it('replaces a stored rate that is one day older', async () => {
    await seedPrices(realPrice('eur_pln', 4.1111, '2026-10-08'));
    const fake = createFakeFetch({ [URLS.nbpCurrent]: nbpCurrentReply() });

    const result = await exchangeRateStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 1, skipped: 0 });
    expect(await storedPrice(database.db, 'eur_pln')).toMatchObject({
      pricePln: 4.3775,
      observedAt: '2026-10-09',
      source: 'Narodowy Bank Polski, tabela A',
    });
  });

  it('replaces a stored sample rate even though its date is later', async () => {
    await seedPrices(samplePrice('eur_pln', 4.3, '2026-12-31'));
    const fake = createFakeFetch({ [URLS.nbpCurrent]: nbpCurrentReply() });

    const result = await exchangeRateStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 1, skipped: 0 });
    expect(await storedPrice(database.db, 'eur_pln')).toMatchObject({
      pricePln: 4.3775,
      observedAt: '2026-10-09',
      source: 'Narodowy Bank Polski, tabela A',
    });
  });

  it('rejects a rate dated more than one day after the current time', async () => {
    // Now + 1 day = 2026-10-12 03:00 UTC; 2026-10-13 is later than that.
    const result = await exchangeRateStep(makeContext(currentRate('2026-10-13', 4.4).fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toEqual([{ item: 'eur_pln', message: expect.stringMatching(/future/) }]);
    expect(await storedPrice(database.db, 'eur_pln')).toBeNull();
  });

  it('accepts a rate dated tomorrow, within the one-day tolerance', async () => {
    const result = await exchangeRateStep(makeContext(currentRate('2026-10-12', 4.4).fetch));

    expect(result).toMatchObject({ ok: true, updated: 1, errors: [] });
    expect(await storedPrice(database.db, 'eur_pln')).toMatchObject({ pricePln: 4.4, observedAt: '2026-10-12' });
  });

  it.each([
    ['no rates', { table: 'A', code: 'EUR', rates: [] }],
    ['another currency', { table: 'A', code: 'USD', rates: [{ effectiveDate: '2026-10-09', mid: 3.7 }] }],
    ['another table', { table: 'C', code: 'EUR', rates: [{ effectiveDate: '2026-10-09', mid: 4.4 }] }],
    ['a rate as text', { table: 'A', code: 'EUR', rates: [{ effectiveDate: '2026-10-09', mid: '4.3775' }] }],
    ['a date that is not a date', { table: 'A', code: 'EUR', rates: [{ effectiveDate: '09.10.2026', mid: 4.3775 }] }],
    ['no rates field', { table: 'A', code: 'EUR' }],
    ['a list instead of an object', []],
    ['null', null],
  ])('rejects a response with %s and writes nothing', async (_what, body) => {
    const fake = createFakeFetch({ [URLS.nbpCurrent]: jsonReply(body) });

    const result = await exchangeRateStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].item).toBe('eur_pln');
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('rejects a response that is not JSON', async () => {
    const fake = createFakeFetch({ [URLS.nbpCurrent]: textReply('<html>Service unavailable</html>', 200, 'text/html') });

    const result = await exchangeRateStep(makeContext(fake.fetch));

    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/not valid JSON/);
    expect(result.errors[0].message).not.toMatch(/Service unavailable/);
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('reports HTTP 404 as an error without a second request', async () => {
    const fake = createFakeFetch({ [URLS.nbpCurrent]: statusReply(404) });

    const result = await exchangeRateStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors[0].message).toMatch(/HTTP 404/);
    expect(fake.urls()).toHaveLength(1);
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('in a dry run reports the rate it would store and writes nothing', async () => {
    const fake = createFakeFetch({ [URLS.nbpCurrent]: nbpCurrentReply() });

    const result = await exchangeRateStep(makeContext(fake.fetch, { dryRun: true }));

    expect(result).toMatchObject({ ok: true, updated: 1, skipped: 0, errors: [] });
    expect(result.notes?.join('\n')).toMatch(/4\.3775.*2026-10-09.*dry run/);
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('with the time budget used up makes no request and reports an error', async () => {
    const stored = realPrice('eur_pln', 4.25, '2026-10-01');
    await seedPrices(stored);
    const fake = createFakeFetch({ [URLS.nbpCurrent]: nbpCurrentReply() });

    const result = await exchangeRateStep(expiredContext(fake.fetch));

    expect(fake.urls()).toEqual([]);
    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toEqual([{ item: 'eur_pln', message: expect.stringMatching(/time budget/i) }]);
    expect(await storedPrice(database.db, 'eur_pln')).toEqual(stored);
  });
});

describe('rate on a given day', () => {
  it('asks for the seven days that end on the given day', async () => {
    const fake = createFakeFetch({
      [URLS.nbpRange('2026-09-29', '2026-10-05')]: nbpRangeReply('2026-09-29_2026-10-05'),
    });

    const rate = await getEurRateOn(makeContext(fake.fetch), '2026-10-05');

    expect(fake.urls()).toEqual([
      'https://api.nbp.pl/api/exchangerates/rates/a/eur/2026-09-29/2026-10-05/?format=json',
    ]);
    // Published on Monday 2026-10-05 itself.
    expect(rate).toBe(4.3855);
  });

  it('on a Sunday returns the rate of the Friday before', async () => {
    const fake = createFakeFetch({
      [URLS.nbpRange('2026-09-28', '2026-10-04')]: nbpRangeReply('2026-09-28_2026-10-04'),
    });

    // 2026-10-04 is a Sunday; the last publication before it is Friday 2026-10-02.
    expect(await getEurRateOn(makeContext(fake.fetch), '2026-10-04')).toBe(4.3745);
  });

  it('on a Sunday a week later returns the rate of that week\'s Friday', async () => {
    const fake = createFakeFetch({
      [URLS.nbpRange('2026-10-05', '2026-10-11')]: nbpRangeReply('2026-10-05_2026-10-11'),
    });
    expect(await getEurRateOn(makeContext(fake.fetch), '2026-10-11')).toBe(4.3775);
  });

  it('takes the entry with the latest date, whatever the order of the entries', async () => {
    const fake = createFakeFetch({
      [URLS.nbpRange('2026-09-29', '2026-10-05')]: jsonReply(
        nbpBody([
          { effectiveDate: '2026-10-02', mid: 4.2 },
          { effectiveDate: '2026-10-05', mid: 4.5 },
          { effectiveDate: '2026-09-30', mid: 4.1 },
        ]),
      ),
    });
    expect(await getEurRateOn(makeContext(fake.fetch), '2026-10-05')).toBe(4.5);
  });

  it('crosses a month and a year boundary when counting the seven days', async () => {
    const fake = createFakeFetch({
      [URLS.nbpRange('2025-12-27', '2026-01-02')]: jsonReply(nbpBody([{ effectiveDate: '2026-01-02', mid: 4.26 }])),
    });
    expect(await getEurRateOn(makeContext(fake.fetch), '2026-01-02')).toBe(4.26);
  });

  it('throws for a rate outside 3.00 to 7.00', async () => {
    const fake = createFakeFetch({
      [URLS.nbpRange('2026-09-29', '2026-10-05')]: jsonReply(nbpBody([{ effectiveDate: '2026-10-05', mid: 7.5 }])),
    });
    await expect(getEurRateOn(makeContext(fake.fetch), '2026-10-05')).rejects.toThrow(/outside the valid range/);
  });

  it('throws when no rate was published in the seven days (HTTP 404)', async () => {
    const fake = createFakeFetch({ [URLS.nbpRange('2026-09-29', '2026-10-05')]: statusReply(404) });
    await expect(getEurRateOn(makeContext(fake.fetch), '2026-10-05')).rejects.toThrow(/HTTP 404/);
  });

  it.each(['05.10.2026', '2026-13-01', '', 'today'])('throws for the date "%s" without making a request', async (date) => {
    const fake = createFakeFetch();
    await expect(getEurRateOn(makeContext(fake.fetch), date)).rejects.toThrow();
    expect(fake.urls()).toEqual([]);
  });

  it('with the time budget used up makes no request', async () => {
    const fake = createFakeFetch({
      [URLS.nbpRange('2026-09-29', '2026-10-05')]: nbpRangeReply('2026-09-29_2026-10-05'),
    });
    await expect(getEurRateOn(expiredContext(fake.fetch), '2026-10-05')).rejects.toThrow(/time budget/i);
    expect(fake.urls()).toEqual([]);
  });
});

describe('requests to a source', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const url = URLS.nbpRange('2026-09-29', '2026-10-05');

  it('are repeated once after an HTTP 5xx answer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let attempt = 0;
    const fake = createFakeFetch({
      [url]: (requested) => {
        attempt += 1;
        return attempt === 1 ? statusReply(503)(requested) : nbpRangeReply('2026-09-29_2026-10-05')(requested);
      },
    });

    const pending = getEurRateOn(makeContext(fake.fetch), '2026-10-05');
    await vi.advanceTimersByTimeAsync(5_000);

    expect(await pending).toBe(4.3855);
    expect(fake.urls()).toEqual([url, url]);
  });

  it('are given up after the second HTTP 5xx answer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const fake = createFakeFetch({ [url]: statusReply(500) });

    const pending = getEurRateOn(makeContext(fake.fetch), '2026-10-05');
    const outcome = expect(pending).rejects.toThrow(/HTTP 500/);
    await vi.advanceTimersByTimeAsync(5_000);
    await outcome;

    expect(fake.urls()).toEqual([url, url]);
  });

  it('are repeated once after a network error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let attempt = 0;
    const fake = createFakeFetch({
      [url]: (requested) => {
        attempt += 1;
        if (attempt === 1) throw new TypeError('fetch failed');
        return nbpRangeReply('2026-09-29_2026-10-05')(requested);
      },
    });

    const pending = getEurRateOn(makeContext(fake.fetch), '2026-10-05');
    await vi.advanceTimersByTimeAsync(5_000);

    expect(await pending).toBe(4.3855);
    expect(fake.urls()).toEqual([url, url]);
  });

  it('do not put the query string of the address into the error message', async () => {
    const fake = createFakeFetch({ [url]: statusReply(404) });
    const error = await getEurRateOn(makeContext(fake.fetch), '2026-10-05').catch((e: Error) => e);
    expect((error as Error).message).toBe('HTTP 404 from api.nbp.pl/api/exchangerates/rates/a/eur/2026-09-29/2026-10-05/');
  });
});
