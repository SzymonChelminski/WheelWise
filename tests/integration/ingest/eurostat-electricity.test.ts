import { describe, expect, it } from 'vitest';
import { electricityStep } from '@/ingest/sources/eurostat-electricity';
import { expiredContext, fixedClock, makeContext } from '../helpers/clock';
import { allPriceRows, realPrice, samplePrice, seedPrices, storedPrice, setupTestDatabase } from '../helpers/database';
import { createFakeFetch, jsonReply, statusReply, type FakeFetch } from '../helpers/fake-fetch';
import { eurostatBody, eurostatReply, URLS } from '../helpers/sources';

// Electricity price step. The clock stands at 2026-10-11 03:00 UTC.
// Recorded response: 1.1505 PLN/kWh for 2025-S2 and 1.2724 PLN/kWh for 2026-S1.

const database = setupTestDatabase();

const SOURCE = 'Eurostat, nrg_pc_204';

const recorded = (): FakeFetch => createFakeFetch({ [URLS.eurostat]: eurostatReply() });

const answering = (body: unknown): FakeFetch => createFakeFetch({ [URLS.eurostat]: jsonReply(body) });

describe('electricity price step', () => {
  it('stores the price of the latest half-year, dated on its first day', async () => {
    const result = await electricityStep(makeContext(recorded().fetch));

    expect(result).toMatchObject({ source: 'electricity', ok: true, updated: 1, skipped: 0, errors: [] });
    expect(await storedPrice(database.db, 'electricity')).toEqual({
      key: 'electricity',
      pricePln: 1.2724,
      observedAt: '2026-01-01',
      source: SOURCE,
      sourceUrl:
        'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204' +
        '?format=JSON&geo=PL&currency=NAC&tax=I_TAX&nrg_cons=KWH2500-4999&lastTimePeriod=2',
    });
  });

  it('makes one request, for Poland, national currency, all taxes included, 2500-4999 kWh', async () => {
    const fake = recorded();

    await electricityStep(makeContext(fake.fetch));

    expect(fake.urls()).toHaveLength(1);
    const url = new URL(fake.urls()[0]);
    expect(url.origin + url.pathname).toBe(
      'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      format: 'JSON',
      geo: 'PL',
      currency: 'NAC',
      tax: 'I_TAX',
      nrg_cons: 'KWH2500-4999',
      lastTimePeriod: '2',
    });
  });

  it('writes only the electricity row', async () => {
    await electricityStep(makeContext(recorded().fetch));
    expect((await allPriceRows(database.db)).map((row) => row.key)).toEqual(['electricity']);
  });

  it('uses the latest period that has a value when the newest period has none', async () => {
    const fake = answering(eurostatBody({ '2025-S2': 1.1505, '2026-S1': 1.2724, '2026-S2': undefined }));

    await electricityStep(makeContext(fake.fetch));

    expect(await storedPrice(database.db, 'electricity')).toMatchObject({ pricePln: 1.2724, observedAt: '2026-01-01' });
  });

  it('treats a null value as no value', async () => {
    const fake = answering(eurostatBody({ '2025-S2': 1.1505, '2026-S1': null }));

    await electricityStep(makeContext(fake.fetch));

    expect(await storedPrice(database.db, 'electricity')).toMatchObject({ pricePln: 1.1505, observedAt: '2025-07-01' });
  });

  it('picks the latest period by its name, not by its position in the response', async () => {
    const fake = answering(eurostatBody({ '2026-S1': 1.2724, '2024-S2': 0.9, '2025-S2': 1.1505 }));

    await electricityStep(makeContext(fake.fetch));

    expect(await storedPrice(database.db, 'electricity')).toMatchObject({ pricePln: 1.2724, observedAt: '2026-01-01' });
  });

  it('reads values given as a list as well', async () => {
    const fake = answering(eurostatBody({ '2025-S2': 1.1505, '2026-S1': 1.2724 }, { asArray: true }));

    await electricityStep(makeContext(fake.fetch));

    expect(await storedPrice(database.db, 'electricity')).toMatchObject({ pricePln: 1.2724, observedAt: '2026-01-01' });
  });

  it.each([
    ['2026-S1', '2026-01-01'],
    ['2025-S2', '2025-07-01'],
    ['2025-S1', '2025-01-01'],
    ['2026-S2', '2026-07-01'],
  ])('dates the period %s on %s', async (period, observedAt) => {
    const fake = answering(eurostatBody({ [period]: 1.2 }));

    const result = await electricityStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: true, updated: 1, errors: [] });
    expect(await storedPrice(database.db, 'electricity')).toMatchObject({ pricePln: 1.2, observedAt });
  });

  it.each([0.29, 5.01, 0, -1.2, 127.24])('rejects the price %f, outside 0.30 to 5.00, and writes nothing', async (price) => {
    const stored = realPrice('electricity', 1.1, '2025-07-01');
    await seedPrices(stored);
    const fake = answering(eurostatBody({ '2026-S1': price }));

    const result = await electricityStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toEqual([
      { item: 'electricity', message: expect.stringMatching(/outside the valid range/) },
    ]);
    expect(await storedPrice(database.db, 'electricity')).toEqual(stored);
  });

  it('does not fall back to an older period when the latest value is out of range', async () => {
    const fake = answering(eurostatBody({ '2025-S2': 1.1505, '2026-S1': 12.7 }));

    const result = await electricityStep(makeContext(fake.fetch));

    expect(result.ok).toBe(false);
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it.each([0.3, 5])('accepts the price %f at the edge of the range', async (price) => {
    const result = await electricityStep(makeContext(answering(eurostatBody({ '2026-S1': price })).fetch));
    expect(result).toMatchObject({ ok: true, updated: 1, errors: [] });
    expect((await storedPrice(database.db, 'electricity'))?.pricePln).toBe(price);
  });

  it('skips data of the same period as the stored price', async () => {
    const stored = realPrice('electricity', 1.1, '2026-01-01');
    await seedPrices(stored);

    const result = await electricityStep(makeContext(recorded().fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 1, errors: [] });
    expect(await storedPrice(database.db, 'electricity')).toEqual(stored);
  });

  it('skips data that is older than the stored price', async () => {
    const stored = realPrice('electricity', 1.1, '2026-07-01');
    await seedPrices(stored);

    const result = await electricityStep(makeContext(recorded().fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 1, errors: [] });
    expect(await storedPrice(database.db, 'electricity')).toEqual(stored);
  });

  it('replaces a stored price of an earlier period', async () => {
    await seedPrices(realPrice('electricity', 1.1505, '2025-07-01', SOURCE));

    const result = await electricityStep(makeContext(recorded().fetch));

    expect(result).toMatchObject({ ok: true, updated: 1, skipped: 0 });
    expect(await storedPrice(database.db, 'electricity')).toMatchObject({ pricePln: 1.2724, observedAt: '2026-01-01' });
  });

  it('replaces the stored sample price although the real price is dated earlier', async () => {
    // The sample data is dated 2026-10-01; the real half-year price is dated 2026-01-01.
    await seedPrices(samplePrice('electricity', 1.27, '2026-10-01'));

    const result = await electricityStep(makeContext(recorded().fetch));

    expect(result).toMatchObject({ ok: true, updated: 1, skipped: 0, errors: [] });
    expect(await storedPrice(database.db, 'electricity')).toMatchObject({
      pricePln: 1.2724,
      observedAt: '2026-01-01',
      source: SOURCE,
    });
  });

  it('a second run after replacing the sample price skips', async () => {
    await seedPrices(samplePrice('electricity', 1.27, '2026-10-01'));
    await electricityStep(makeContext(recorded().fetch));

    const second = await electricityStep(makeContext(recorded().fetch));

    expect(second).toMatchObject({ ok: true, updated: 0, skipped: 1, errors: [] });
  });

  it.each([
    ['the same date', '2026-01-01'],
    ['a later date', '2026-10-01'],
  ])('does not replace a stored price from any other source with %s', async (_what, observedAt) => {
    const stored = realPrice('electricity', 1.27, observedAt, 'Fixture import');
    await seedPrices(stored);

    const result = await electricityStep(makeContext(recorded().fetch));

    expect(result).toMatchObject({ ok: true, updated: 0, skipped: 1 });
    expect(await storedPrice(database.db, 'electricity')).toEqual(stored);
  });

  it('in a dry run over the sample price reports the replacement and writes nothing', async () => {
    const stored = samplePrice('electricity', 1.27, '2026-10-01');
    await seedPrices(stored);

    const result = await electricityStep(makeContext(recorded().fetch, { dryRun: true }));

    expect(result).toMatchObject({ ok: true, updated: 1, skipped: 0, errors: [] });
    const notes = result.notes?.join('\n') ?? '';
    expect(notes).toMatch(/1\.2724/);
    expect(notes).toMatch(/2026-S1/);
    expect(notes).toMatch(/replaces a fixture value/);
    expect(notes).toMatch(/dry run/);
    expect(await storedPrice(database.db, 'electricity')).toEqual(stored);
  });

  it('in a dry run on an empty table writes nothing', async () => {
    const result = await electricityStep(makeContext(recorded().fetch, { dryRun: true }));
    expect(result).toMatchObject({ ok: true, updated: 1, skipped: 0 });
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('rejects a period that starts more than one day after the current time', async () => {
    // On 2026-06-29 the half-year 2026-S2 (1 July) is still two days away.
    const fake = answering(eurostatBody({ '2026-S1': 1.2724, '2026-S2': 1.3 }));

    const result = await electricityStep(makeContext(fake.fetch, { now: fixedClock('2026-06-29T12:00:00Z') }));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toEqual([{ item: 'electricity', message: expect.stringMatching(/future/) }]);
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('accepts a period that starts within one day of the current time', async () => {
    const fake = answering(eurostatBody({ '2026-S1': 1.2724, '2026-S2': 1.3 }));

    const result = await electricityStep(makeContext(fake.fetch, { now: fixedClock('2026-06-30T12:00:00Z') }));

    expect(result).toMatchObject({ ok: true, updated: 1, errors: [] });
    expect(await storedPrice(database.db, 'electricity')).toMatchObject({ pricePln: 1.3, observedAt: '2026-07-01' });
  });

  it.each([
    ['no period with a value', eurostatBody({ '2025-S2': undefined, '2026-S1': null })],
    ['no periods at all', eurostatBody({})],
    ['a yearly period', eurostatBody({ '2026': 1.2 })],
    ['a quarterly period', eurostatBody({ '2026-Q1': 1.2 })],
    ['more than one country', eurostatBody({ '2026-S1': 1.2 }, { geoCount: 2 })],
    ['a price as text', { ...(eurostatBody({ '2026-S1': 1.2 }) as object), value: { '0': '1.2' } }],
    ['no time dimension', { ...(eurostatBody({ '2026-S1': 1.2 }) as object), dimension: {} }],
    ['an error object', { error: [{ status: 400, label: 'Invalid query' }] }],
    ['null', null],
  ])('rejects a response with %s and writes nothing', async (_what, body) => {
    const stored = realPrice('electricity', 1.1, '2025-07-01');
    await seedPrices(stored);

    const result = await electricityStep(makeContext(answering(body).fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].item).toBe('electricity');
    expect(await storedPrice(database.db, 'electricity')).toEqual(stored);
  });

  it('reports HTTP 404 as an error', async () => {
    const fake = createFakeFetch({ [URLS.eurostat]: statusReply(404) });

    const result = await electricityStep(makeContext(fake.fetch));

    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors[0].message).toMatch(/HTTP 404/);
    expect(await allPriceRows(database.db)).toEqual([]);
  });

  it('with the time budget used up makes no request and reports an error', async () => {
    const fake = recorded();

    const result = await electricityStep(expiredContext(fake.fetch));

    expect(fake.urls()).toEqual([]);
    expect(result).toMatchObject({ ok: false, updated: 0, skipped: 0 });
    expect(result.errors).toEqual([{ item: 'electricity', message: expect.stringMatching(/time budget/i) }]);
    expect(await allPriceRows(database.db)).toEqual([]);
  });
});
