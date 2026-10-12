import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as route from '@/app/api/cron/daily/route';
import { createMemoryDb, setDbForTesting } from '@/db/client';
import { getCarBySlug } from '@/db/repositories';
import {
  allCarRows,
  allPriceRows,
  allRefreshRuns,
  blockNetwork,
  storedPrice,
  setupTestDatabase,
} from '../helpers/database';
import { createFakeFetch, createFetchAnswering, statusReply, type FakeFetch } from '../helpers/fake-fetch';
import { allSourceRoutes, URLS } from '../helpers/sources';

// Cron endpoint of the daily job. The route cannot be given a `fetch` or a clock,
// so the global `fetch` is replaced and the real clock is used; the recorded
// sources are all dated before the day these tests were written.

const database = setupTestDatabase();

const SECRET = 'correct-horse-battery-staple';
const ENDPOINT = 'http://localhost:3000/api/cron/daily';

function request(authorization?: string): Request {
  return new Request(ENDPOINT, { headers: authorization === undefined ? {} : { authorization } });
}

let savedSecret: string | undefined;
let network: FakeFetch;

function setSecret(value: string | undefined): void {
  if (value === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = value;
}

/** Makes the given fake the global `fetch`, which is what the route's job uses. */
function serve(fake: FakeFetch): FakeFetch {
  network = fake;
  vi.stubGlobal('fetch', fake.fetch);
  return fake;
}

beforeEach(() => {
  savedSecret = process.env.CRON_SECRET;
  setSecret(SECRET);
  serve(createFakeFetch(allSourceRoutes()));
});

afterEach(() => {
  setSecret(savedSecret);
  blockNetwork();
  vi.restoreAllMocks();
});

async function expectRejected(response: Response): Promise<void> {
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({});
  expect(response.headers.get('cache-control')).toBe('no-store');
  // The job did not start: no request, no recorded run, no data.
  expect(network.urls()).toEqual([]);
  expect(await allRefreshRuns(database.db)).toEqual([]);
  expect(await allPriceRows(database.db)).toEqual([]);
  expect(await allCarRows(database.db)).toEqual([]);
}

describe('GET /api/cron/daily - authorization', () => {
  it('answers 401 with an empty object when there is no Authorization header', async () => {
    await expectRejected(await route.GET(request()));
  });

  it.each([
    ['another token', 'Bearer wrong-token'],
    ['the secret without "Bearer"', SECRET],
    ['a lower-case scheme', `bearer ${SECRET}`],
    ['another scheme', `Basic ${SECRET}`],
    ['the secret with a trailing character', `Bearer ${SECRET}x`],
    ['a prefix of the secret', `Bearer ${SECRET.slice(0, -1)}`],
    ['the secret in another letter case', `Bearer ${SECRET.toUpperCase()}`],
    ['two spaces after "Bearer"', `Bearer  ${SECRET}`],
    ['an empty header', ''],
    ['"Bearer" alone', 'Bearer'],
  ])('answers 401 for %s', async (_what, header) => {
    await expectRejected(await route.GET(request(header)));
  });

  it.each([
    ['no header', undefined],
    ['"Bearer undefined"', 'Bearer undefined'],
    ['"Bearer " and nothing else', 'Bearer '],
    ['"Bearer null"', 'Bearer null'],
    ['any token', `Bearer ${SECRET}`],
  ])('answers 401 when the secret is not configured and the request has %s', async (_what, header) => {
    setSecret(undefined);
    await expectRejected(await route.GET(request(header)));
  });

  it.each([
    ['"Bearer " and nothing else', 'Bearer '],
    ['"Bearer"', 'Bearer'],
    ['no header', undefined],
  ])('answers 401 when the secret is configured as an empty text and the request has %s', async (_what, header) => {
    setSecret('');
    await expectRejected(await route.GET(request(header)));
  });

  it('does not take the token from the address', async () => {
    const response = await route.GET(new Request(`${ENDPOINT}?token=${SECRET}&authorization=Bearer%20${SECRET}`));
    await expectRejected(response);
  });
});

describe('GET /api/cron/daily - running the job', () => {
  it('answers 200 with the job result for the right token and writes the data', async () => {
    const response = await route.GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toMatch(/application\/json/);

    const body = (await response.json()) as { status: string; results: Record<string, unknown>[] };
    expect(Object.keys(body).sort()).toEqual(['results', 'status']);
    expect(body.status).toBe('ok');
    expect(body.results.map((entry) => [entry.source, entry.ok, entry.updated, entry.skipped, entry.errors])).toEqual([
      ['exchange-rate', true, 1, 0, []],
      ['oil-bulletin', true, 3, 0, []],
      ['electricity', true, 1, 0, []],
      ['catalogue', true, 489, 70, []],
    ]);

    expect(await storedPrice(database.db, 'eur_pln')).toMatchObject({ pricePln: 4.3775, observedAt: '2026-10-09' });
    expect(await storedPrice(database.db, 'petrol')).toMatchObject({ pricePln: 6.6642, observedAt: '2026-10-05' });
    expect((await getCarBySlug('alfa-romeo-giulia-sedan-hatchback-diesel-automatic-118kw'))?.listPricePln).toBe(204600);
    expect((await allRefreshRuns(database.db)).map((run) => [run.job, run.status])).toEqual([['daily', 'ok']]);
  });

  it('does not run in dry-run mode: the run is recorded', async () => {
    await route.GET(request(`Bearer ${SECRET}`));
    expect(await allRefreshRuns(database.db)).toHaveLength(1);
  });

  it('answers 200 when the job is partial', async () => {
    serve(createFakeFetch({ ...allSourceRoutes(), [URLS.eurostat]: statusReply(404) }));

    const response = await route.GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; results: { source: string; ok: boolean }[] };
    expect(body.status).toBe('partial');
    expect(body.results.map((entry) => entry.ok)).toEqual([true, true, false, true]);
  });

  it('answers 500 with the job result when the job fails', async () => {
    serve(createFetchAnswering(404));

    const response = await route.GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as { status: string; results: { source: string; ok: boolean }[] };
    expect(body.status).toBe('failed');
    expect(body.results.map((entry) => [entry.source, entry.ok])).toEqual([
      ['exchange-rate', false],
      ['oil-bulletin', false],
      ['electricity', false],
      ['catalogue', false],
    ]);
    expect((await allRefreshRuns(database.db)).map((run) => run.status)).toEqual(['failed']);
  });

  it('answers 500 without details when the job crashes', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    // A database without tables: the job cannot even record its start.
    const broken = await createMemoryDb();
    setDbForTesting(broken);
    try {
      const response = await route.GET(request(`Bearer ${SECRET}`));

      expect(response.status).toBe(500);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const text = await response.text();
      expect(JSON.parse(text)).toEqual({ status: 'failed', results: [] });
      expect(text).not.toMatch(/refresh_runs|relation|insert|select|stack|\.ts/i);
      expect(logged).toHaveBeenCalledTimes(1);
      expect(network.urls()).toEqual([]);
    } finally {
      setDbForTesting(database.db);
      await (broken as unknown as { $client: { close: () => Promise<void> } }).$client.close();
    }
  });

  it('does not put the secret into the response or the log', async () => {
    const logs = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'info').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
    ];

    const response = await route.GET(request(`Bearer ${SECRET}`));

    expect(await response.text()).not.toContain(SECRET);
    for (const log of logs) {
      for (const call of log.mock.calls) expect(call.join(' ')).not.toContain(SECRET);
    }
    for (const sent of network.requests) {
      expect(sent.url).not.toContain(SECRET);
      expect(Object.values(sent.headers).join(' ')).not.toContain(SECRET);
    }
  });
});

describe('GET /api/cron/daily - route settings', () => {
  it('allows the function to run for 300 seconds', () => {
    expect(route.maxDuration).toBe(300);
  });

  it('offers GET and no method that changes data', () => {
    const exported = Object.keys(route);
    expect(exported).toContain('GET');
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) expect(exported).not.toContain(method);
  });
});
