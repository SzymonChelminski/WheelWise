import { afterEach, describe, expect, it } from 'vitest';
import { bootstrapFromFixtures } from '@/db/bootstrap';
import { getActiveCars, getCarBySlug, getEurRate, getLastRefreshRun, getMarketPrices } from '@/db/repositories';
import { dailySteps } from '@/ingest/jobs';
import { computeStatus, runJob } from '@/ingest/run-job';
import type { JobContext, JobStep, SourceResult } from '@/ingest/types';
import { FIXED_NOW, fixedClock } from '../helpers/clock';
import {
  allCarRows,
  allPriceRows,
  allRefreshRuns,
  realPrice,
  seedPrices,
  storedPrice,
  setupTestDatabase,
} from '../helpers/database';
import { createFakeFetch, createFetchAnswering, statusReply } from '../helpers/fake-fetch';
import { allSourceRoutes, URLS } from '../helpers/sources';

// Daily job. The clock stands at 2026-10-11 03:00 UTC (epoch 1 791 687 600 000 ms).

const database = setupTestDatabase();

const GIULIA = 'alfa-romeo-giulia-diesel-automatic-160km';
const STEP_NAMES = ['exchange-rate', 'oil-bulletin', 'electricity', 'catalogue'];

const result = (source: string, overrides: Partial<SourceResult> = {}): SourceResult => ({
  source,
  ok: true,
  updated: 0,
  skipped: 0,
  errors: [],
  ...overrides,
});

const failure = (source: string): SourceResult =>
  result(source, { ok: false, errors: [{ item: source, message: `${source} is down` }] });

describe('job status', () => {
  it('is ok when every step is ok and has no errors', () => {
    expect(computeStatus([result('a', { updated: 1 }), result('b', { skipped: 3 }), result('c')])).toBe('ok');
  });

  it('is failed when every step failed', () => {
    expect(computeStatus([failure('a'), failure('b')])).toBe('failed');
  });

  it('is partial when some steps failed and some did not', () => {
    expect(computeStatus([result('a', { updated: 1 }), failure('b')])).toBe('partial');
    expect(computeStatus([failure('a'), failure('b'), result('c')])).toBe('partial');
  });

  it('is partial when a step is ok but reports an error on one item', () => {
    const withItemError = result('a', { updated: 2, errors: [{ item: 'lpg', message: 'out of range' }] });
    expect(computeStatus([withItemError, result('b')])).toBe('partial');
    expect(computeStatus([withItemError])).toBe('partial');
  });
});

describe('daily job - step list', () => {
  it('runs the exchange rate first, then fuel prices, electricity and the catalogue', () => {
    expect(dailySteps.map((step) => step.name)).toEqual(STEP_NAMES);
  });
});

describe('daily job - with replaced steps', () => {
  const original = [...dailySteps];

  function replaceSteps(...steps: JobStep[]): void {
    dailySteps.splice(0, dailySteps.length, ...steps);
  }

  afterEach(() => {
    dailySteps.splice(0, dailySteps.length, ...original);
  });

  const neverFetch = createFakeFetch().fetch;
  const run = (options: Parameters<typeof runJob>[1] = {}) =>
    runJob('daily', { fetch: neverFetch, now: fixedClock(), ...options });

  it('a step that throws does not stop the steps after it', async () => {
    const ran: string[] = [];
    replaceSteps(
      { name: 'first', run: async () => (ran.push('first'), result('first', { updated: 1 })) },
      {
        name: 'second',
        run: async () => {
          ran.push('second');
          throw new Error('the source exploded');
        },
      },
      { name: 'third', run: async () => (ran.push('third'), result('third', { skipped: 2 })) },
    );

    const job = await run();

    expect(ran).toEqual(['first', 'second', 'third']);
    expect(job.status).toBe('partial');
    expect(job.results).toEqual([
      result('first', { updated: 1 }),
      {
        source: 'second',
        ok: false,
        updated: 0,
        skipped: 0,
        errors: [{ item: 'second', message: 'the source exploded' }],
      },
      result('third', { skipped: 2 }),
    ]);
  });

  it('a step that throws something that is not an Error is reported as well', async () => {
    replaceSteps({
      name: 'odd',
      run: async () => {
        throw 'plain text failure';
      },
    });

    const job = await run();

    expect(job.status).toBe('failed');
    expect(job.results[0].errors).toEqual([{ item: 'odd', message: 'plain text failure' }]);
  });

  it('every step throwing gives the status failed', async () => {
    const boom = async (): Promise<SourceResult> => {
      throw new Error('down');
    };
    replaceSteps({ name: 'a', run: boom }, { name: 'b', run: boom });

    expect((await run()).status).toBe('failed');
  });

  it('every step ok gives the status ok', async () => {
    replaceSteps(
      { name: 'a', run: async () => result('a', { updated: 1 }) },
      { name: 'b', run: async () => result('b', { skipped: 1 }) },
    );

    expect((await run()).status).toBe('ok');
  });

  it('gives each step the dry-run flag, the injected fetch and clock, and a deadline 240 s after the start', async () => {
    const seen: JobContext[] = [];
    const record = async (ctx: JobContext) => (seen.push(ctx), result('seen'));
    replaceSteps({ name: 'a', run: record }, { name: 'b', run: record });
    const fake = createFakeFetch();
    const now = fixedClock();

    await runJob('daily', { fetch: fake.fetch, now });

    expect(seen).toHaveLength(2);
    for (const ctx of seen) {
      expect(ctx.dryRun).toBe(false);
      expect(ctx.fetch).toBe(fake.fetch);
      expect(ctx.now).toBe(now);
      expect(ctx.deadline).toBe(Date.parse(FIXED_NOW) + 240_000);
    }
    expect(Date.parse(FIXED_NOW)).toBe(1_791_687_600_000);
  });

  it('uses the given time budget for the deadline', async () => {
    let deadline = 0;
    replaceSteps({ name: 'a', run: async (ctx) => ((deadline = ctx.deadline), result('a')) });

    await run({ budgetMs: 1500 });

    expect(deadline).toBe(1_791_687_601_500);
  });

  it('records the run with its status and the results of every step', async () => {
    replaceSteps(
      { name: 'a', run: async () => result('a', { updated: 2, notes: ['two values'] }) },
      { name: 'b', run: async () => failure('b') },
    );

    const job = await run();

    const runs = await allRefreshRuns(database.db);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ id: 1, job: 'daily', status: 'partial' });
    expect(runs[0].finishedAt).toBeInstanceOf(Date);
    const summary = runs[0].summary as { results: SourceResult[]; revalidated: boolean };
    expect(summary.results).toEqual(job.results);
    expect(typeof summary.revalidated).toBe('boolean');
  });

  it.each([
    ['ok', [result('a', { skipped: 1 })]],
    ['partial', [result('a', { skipped: 1 }), failure('b')]],
    ['failed', [failure('a'), failure('b')]],
  ] as [string, SourceResult[]][])('records the status %s', async (status, results) => {
    replaceSteps(...results.map((entry) => ({ name: entry.source, run: async () => entry })));

    const job = await run();

    expect(job.status).toBe(status);
    const runs = await allRefreshRuns(database.db);
    expect(runs.map((entry) => entry.status)).toEqual([status]);
    expect((runs[0].summary as { revalidated: boolean }).revalidated).toBe(false);
  });

  it('a good run becomes the last refresh; a failed run does not', async () => {
    replaceSteps({ name: 'a', run: async () => result('a', { skipped: 1 }) });
    await run();
    replaceSteps({ name: 'a', run: async () => failure('a') });
    await run();

    expect(await allRefreshRuns(database.db)).toHaveLength(2);
    expect(await getLastRefreshRun()).toMatchObject({ id: 1, status: 'ok' });
  });

  it('a dry run passes the flag to the steps and records no run', async () => {
    const flags: boolean[] = [];
    replaceSteps({ name: 'a', run: async (ctx) => (flags.push(ctx.dryRun), result('a', { updated: 5 })) });

    const job = await run({ dryRun: true });

    expect(flags).toEqual([true]);
    expect(job).toEqual({ status: 'ok', results: [result('a', { updated: 5 })] });
    expect(await allRefreshRuns(database.db)).toEqual([]);
  });
});

describe('daily job - real steps on recorded sources', () => {
  const run = (routes = allSourceRoutes(), options: Parameters<typeof runJob>[1] = {}) => {
    const fake = createFakeFetch(routes);
    return runJob('daily', { fetch: fake.fetch, now: fixedClock(), ...options }).then((job) => ({ job, fake }));
  };

  it('replaces all sample data: five prices and the catalogue', async () => {
    await bootstrapFromFixtures(database.db);

    const { job } = await run();

    expect(job.status).toBe('ok');
    expect(job.results.map((entry) => [entry.source, entry.ok, entry.updated, entry.errors])).toEqual([
      ['exchange-rate', true, 1, []],
      ['oil-bulletin', true, 3, []],
      ['electricity', true, 1, []],
      ['catalogue', true, 489, []],
    ]);

    expect((await allPriceRows(database.db)).map((row) => [row.key, Number(row.pricePln), row.observedAt, row.source])).toEqual([
      ['diesel', 7.738, '2026-10-05', 'European Commission, Weekly Oil Bulletin'],
      ['electricity', 1.2724, '2026-01-01', 'Eurostat, nrg_pc_204'],
      ['eur_pln', 4.3775, '2026-10-09', 'Narodowy Bank Polski, tabela A'],
      ['lpg', 3.2455, '2026-10-05', 'European Commission, Weekly Oil Bulletin'],
      ['petrol', 6.6642, '2026-10-05', 'European Commission, Weekly Oil Bulletin'],
    ]);
    // 45 600 EUR: 201 000 PLN at the sample rate 4.30, 204 600 PLN at 4.3775.
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(204600);
    expect(await getActiveCars()).toHaveLength(489);
  });

  it('the new values are readable through the repositories right after the run', async () => {
    await bootstrapFromFixtures(database.db);
    await run();

    const prices = await getMarketPrices();
    expect([prices.petrol.pricePln, prices.diesel.pricePln, prices.lpg.pricePln, prices.electricity.pricePln]).toEqual([
      6.6642, 7.738, 3.2455, 1.2724,
    ]);
    expect((await getEurRate())?.pricePln).toBe(4.3775);
    expect(await getLastRefreshRun()).toMatchObject({ id: 1, job: 'daily', status: 'ok' });
  });

  it('records the run with the results it returned', async () => {
    await bootstrapFromFixtures(database.db);

    const { job } = await run();

    const runs = await allRefreshRuns(database.db);
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe('ok');
    const summary = runs[0].summary as { results: SourceResult[]; revalidated: boolean };
    expect(summary.results).toEqual(JSON.parse(JSON.stringify(job.results)));
    expect(summary.results.map((entry) => entry.source)).toEqual(STEP_NAMES);
  });

  it('a second run skips everything and changes nothing', async () => {
    await bootstrapFromFixtures(database.db);
    await run();
    const carsBefore = await allCarRows(database.db);
    const pricesBefore = await allPriceRows(database.db);

    const { job } = await run();

    expect(job.status).toBe('ok');
    expect(job.results.map((entry) => [entry.source, entry.updated, entry.skipped])).toEqual([
      ['exchange-rate', 0, 1],
      ['oil-bulletin', 0, 3],
      ['electricity', 0, 1],
      ['catalogue', 0, 489],
    ]);
    expect(await allCarRows(database.db)).toEqual(carsBefore);
    expect(await allPriceRows(database.db)).toEqual(pricesBefore);
    expect((await allRefreshRuns(database.db)).map((entry) => entry.status)).toEqual(['ok', 'ok']);
  });

  it('works on an empty database as well', async () => {
    const { job } = await run();

    expect(job.status).toBe('ok');
    expect(await getActiveCars()).toHaveLength(489);
    expect((await allPriceRows(database.db)).map((row) => row.key)).toEqual([
      'diesel',
      'electricity',
      'eur_pln',
      'lpg',
      'petrol',
    ]);
  });

  it('one unreachable source makes the job partial and the other steps still write', async () => {
    await bootstrapFromFixtures(database.db);

    const { job } = await run({ ...allSourceRoutes(), [URLS.oilBulletinFile]: statusReply(404) });

    expect(job.status).toBe('partial');
    expect(job.results.map((entry) => [entry.source, entry.ok])).toEqual([
      ['exchange-rate', true],
      ['oil-bulletin', false],
      ['electricity', true],
      ['catalogue', true],
    ]);
    expect(await storedPrice(database.db, 'petrol')).toMatchObject({ pricePln: 6.5, source: 'fixture' });
    expect(await storedPrice(database.db, 'electricity')).toMatchObject({ pricePln: 1.2724 });
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(204600);
    expect((await allRefreshRuns(database.db)).map((entry) => entry.status)).toEqual(['partial']);
  });

  it('the first source failing does not stop the later ones', async () => {
    await seedPrices(realPrice('eur_pln', 4.4, '2026-10-01', 'Narodowy Bank Polski, tabela A'));

    const { job } = await run({ ...allSourceRoutes(), [URLS.nbpCurrent]: statusReply(404) });

    expect(job.status).toBe('partial');
    expect(job.results.map((entry) => entry.ok)).toEqual([false, true, true, true]);
    // The catalogue is priced at the rate that was already stored.
    expect((await getCarBySlug(GIULIA))?.listPricePln).toBe(205700);
  });

  it('every source unreachable makes the job failed and leaves the data alone', async () => {
    await bootstrapFromFixtures(database.db);
    const carsBefore = await allCarRows(database.db);
    const pricesBefore = await allPriceRows(database.db);
    const down = createFetchAnswering(404);

    const job = await runJob('daily', { fetch: down.fetch, now: fixedClock() });

    expect(job.status).toBe('failed');
    expect(job.results.map((entry) => [entry.source, entry.ok, entry.updated, entry.skipped])).toEqual(
      STEP_NAMES.map((name) => [name, false, 0, 0]),
    );
    expect(await allCarRows(database.db)).toEqual(carsBefore);
    expect(await allPriceRows(database.db)).toEqual(pricesBefore);
    expect((await allRefreshRuns(database.db)).map((entry) => entry.status)).toEqual(['failed']);
    expect(await getLastRefreshRun()).toBeNull();
  });

  it('a dry run fetches, reports what it would write, and writes nothing at all', async () => {
    await bootstrapFromFixtures(database.db);
    const carsBefore = await allCarRows(database.db);
    const pricesBefore = await allPriceRows(database.db);

    const { job, fake } = await run(allSourceRoutes(), { dryRun: true });

    expect(job.status).toBe('ok');
    expect(job.results.map((entry) => [entry.source, entry.updated])).toEqual([
      ['exchange-rate', 1],
      ['oil-bulletin', 3],
      ['electricity', 1],
      ['catalogue', 489],
    ]);
    expect(fake.urls().length).toBeGreaterThanOrEqual(9);
    expect(await allCarRows(database.db)).toEqual(carsBefore);
    expect(await allPriceRows(database.db)).toEqual(pricesBefore);
    expect(await allRefreshRuns(database.db)).toEqual([]);
  });

  it('a dry run on an empty database leaves it empty', async () => {
    const { job } = await run(allSourceRoutes(), { dryRun: true });

    expect(job.status).toBe('ok');
    expect(await allCarRows(database.db)).toEqual([]);
    expect(await allPriceRows(database.db)).toEqual([]);
    expect(await allRefreshRuns(database.db)).toEqual([]);
  });

  it('with no time budget no step makes a request, nothing is written and the run is recorded as failed', async () => {
    await bootstrapFromFixtures(database.db);
    const carsBefore = await allCarRows(database.db);
    const pricesBefore = await allPriceRows(database.db);

    const { job, fake } = await run(allSourceRoutes(), { budgetMs: 0 });

    expect(fake.urls()).toEqual([]);
    expect(job.status).toBe('failed');
    for (const entry of job.results) {
      expect(entry).toMatchObject({ ok: false, updated: 0, skipped: 0 });
      expect(entry.errors).toHaveLength(1);
      expect(entry.errors[0].message).toMatch(/time budget/i);
    }
    expect(await allCarRows(database.db)).toEqual(carsBefore);
    expect(await allPriceRows(database.db)).toEqual(pricesBefore);
    expect((await allRefreshRuns(database.db)).map((entry) => entry.status)).toEqual(['failed']);
  });

  it('requests only the recorded addresses of the four sources', async () => {
    const { fake } = await run();

    const hosts = [...new Set(fake.urls().map((url) => new URL(url).host))].sort();
    expect(hosts).toEqual(['api.nbp.pl', 'data.ademe.fr', 'ec.europa.eu', 'energy.ec.europa.eu']);
    expect(fake.urls()).toEqual([
      URLS.nbpCurrent,
      URLS.oilBulletinFile,
      URLS.nbpRange('2026-09-29', '2026-10-05'),
      URLS.eurostat,
      URLS.ademeMetadata,
      URLS.ademeRows,
      `${URLS.ademeRows}&after=1000`,
      `${URLS.ademeRows}&after=2000`,
      `${URLS.ademeRows}&after=3000`,
    ]);
  });
});
