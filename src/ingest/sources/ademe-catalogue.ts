import { z } from 'zod';
import { FRENCH_VAT_RATE, POLISH_VAT_RATE } from '@/config/catalog';
import { ADEME, FIXTURE_SOURCE, FUTURE_DATE_TOLERANCE_MS } from '@/config/sources';
import { getActiveCars, getEurRate, replaceCatalog } from '@/db/repositories';
import { ademeRowSchema, brandsSchema, buildCatalog, type AdemeRow } from '@/lib/catalog';
import type { Car, CarInput } from '@/lib/domain/types';
import brandsData from '../../../data/brands.json';
import { fetchJson, parseExternal } from '../http';
import { getEurRateOn } from './nbp';
import { addError, finishResult, newResult, type JobContext, type SourceResult } from '../types';

const metadataSchema = z.object({ dataUpdatedAt: z.iso.datetime() });

// `total` is present on the first page only; `next` is absent on the last one.
const pageSchema = z.object({
  total: z.number().int().nonnegative().optional(),
  next: z.string().optional(),
  results: z.array(z.unknown()),
});

function formatCounts(counts: Iterable<[string, number]>): string {
  return [...counts].map(([name, count]) => `${name} ${count}`).join(', ') || 'none';
}

/** Throws unless `next` stays on the dataset API of the ADEME host. */
function assertSameApi(next: string): void {
  let url: URL;
  try {
    url = new URL(next);
  } catch {
    throw new Error('ADEME returned a "next" link that is not a URL');
  }
  if (url.protocol !== 'https:' || url.host !== ADEME.host) {
    throw new Error(`ADEME "next" link points to a different host: ${url.host}`);
  }
  if (!url.pathname.startsWith(ADEME.apiPathPrefix)) {
    throw new Error(`ADEME "next" link points outside ${ADEME.apiPathPrefix}: ${url.pathname}`);
  }
}

async function fetchObservedAt(ctx: JobContext): Promise<string> {
  const { dataUpdatedAt } = parseExternal(
    metadataSchema,
    await fetchJson(ctx, ADEME.metadataUrl),
    'ADEME dataset metadata',
  );
  const observedAt = dataUpdatedAt.slice(0, 10);
  if (Date.parse(dataUpdatedAt) > ctx.now().getTime() + FUTURE_DATE_TOLERANCE_MS) {
    throw new Error(`ADEME dataUpdatedAt ${dataUpdatedAt} is in the future`);
  }
  return observedAt;
}

async function fetchAllRows(ctx: JobContext): Promise<{ rows: unknown[]; pages: number }> {
  const rows: unknown[] = [];
  let total: number | undefined;
  let pages = 0;
  let url: string | undefined = ADEME.rowsUrl;
  while (url) {
    if (pages >= ADEME.maxPages) {
      throw new Error(`ADEME returned more than ${ADEME.maxPages} pages of rows`);
    }
    const page: z.infer<typeof pageSchema> = parseExternal(
      pageSchema,
      await fetchJson(ctx, url, ADEME.rowsTimeoutMs),
      'ADEME rows page',
    );
    pages += 1;
    if (pages === 1) {
      if (page.total === undefined) throw new Error('ADEME rows response has no "total"');
      total = page.total;
    }
    rows.push(...page.results);
    url = page.next;
    if (url) assertSameApi(url);
  }
  if (rows.length !== total) {
    throw new Error(`ADEME rows collected (${rows.length}) differ from the reported total (${total})`);
  }
  return { rows, pages };
}

function validateRows(raw: unknown[]): { rows: AdemeRow[]; dropped: number } {
  const rows: AdemeRow[] = [];
  let firstFailure: string | undefined;
  for (const item of raw) {
    const parsed = ademeRowSchema.safeParse(item);
    if (parsed.success) rows.push(parsed.data);
    else firstFailure ??= z.prettifyError(parsed.error);
  }
  const dropped = raw.length - rows.length;
  if (raw.length > 0 && dropped / raw.length > ADEME.maxInvalidRowShare) {
    throw new Error(
      `${dropped} of ${raw.length} ADEME rows fail validation (limit ${ADEME.maxInvalidRowShare * 100}%). ` +
        `First failure:\n${firstFailure}`,
    );
  }
  return { rows, dropped };
}

/**
 * The stored rate when it is a real one. A fixture rate is invented, so catalogue
 * prices must not be built on it; the current NBP rate is fetched instead.
 * In a dry run the database is not consulted for the rate at all.
 */
async function resolveEurRate(ctx: JobContext): Promise<{ eurPln: number; origin: string }> {
  if (!ctx.dryRun) {
    const stored = await getEurRate();
    if (stored && stored.source !== FIXTURE_SOURCE) {
      return { eurPln: stored.pricePln, origin: `database, ${stored.observedAt}` };
    }
  }
  const today = ctx.now().toISOString().slice(0, 10);
  return { eurPln: await getEurRateOn(ctx, today), origin: 'NBP, fetched now' };
}

function assertGuards(validRows: number, built: number, activeCars: number): void {
  if (validRows < ADEME.minValidRows) {
    throw new Error(`Only ${validRows} valid rows downloaded (minimum ${ADEME.minValidRows})`);
  }
  if (built < ADEME.minCars) {
    throw new Error(`Only ${built} cars built (minimum ${ADEME.minCars})`);
  }
  if (activeCars > 0 && built < activeCars * ADEME.minCarsShareOfActive) {
    throw new Error(
      `Only ${built} cars built, fewer than ${ADEME.minCarsShareOfActive * 100}% of the ${activeCars} active cars`,
    );
  }
}

/** The EUR/PLN rate behind the stored prices, read from the car with the highest EUR price. */
function impliedRate(current: Car[]): number {
  const top = current.reduce((a, b) => (b.priceEur > a.priceEur ? b : a));
  return top.listPricePln / ((top.priceEur * (1 + POLISH_VAT_RATE)) / (1 + FRENCH_VAT_RATE));
}

function isUnchanged(current: Car[], observedAt: string, eurPln: number): boolean {
  if (current.length === 0 || current.some((car) => car.priceObservedAt !== observedAt)) return false;
  const implied = impliedRate(current);
  return Math.abs(eurPln - implied) / implied < ADEME.rateChangeTolerance;
}

function countByFuelType(cars: CarInput[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const car of cars) counts.set(car.fuelType, (counts.get(car.fuelType) ?? 0) + 1);
  return counts;
}

/** Step `catalogue`: rebuilds the car catalogue from the ADEME Car Labelling dataset. */
export async function catalogueStep(ctx: JobContext): Promise<SourceResult> {
  const result = newResult('catalogue');
  try {
    const observedAt = await fetchObservedAt(ctx);
    const { rows: raw, pages } = await fetchAllRows(ctx);
    const { rows, dropped } = validateRows(raw);
    const { eurPln, origin } = await resolveEurRate(ctx);

    const built = buildCatalog(rows, {
      eurPln,
      observedAt,
      sourceUrl: ADEME.pageUrl,
      brands: brandsSchema.parse(brandsData),
    });
    // The builder returns an empty string for a row with an empty make.
    const unknownMakes = built.unknownMakes.filter((make) => make.trim() !== '');
    const current = await getActiveCars();
    assertGuards(rows.length, built.cars.length, current.length);

    const skippedByBuilder = built.skipped.reduce((sum, entry) => sum + entry.count, 0);
    result.notes?.push(
      `dataset updated ${observedAt}`,
      `rows downloaded ${raw.length} in ${pages} pages, valid ${rows.length}, dropped ${dropped}`,
      `EUR/PLN ${eurPln} (${origin})`,
      `cars built ${built.cars.length}: ${formatCounts(countByFuelType(built.cars))}`,
      `rows skipped by the builder: ${formatCounts(built.skipped.map((s) => [s.reason, s.count]))}`,
      `unknown makes: ${unknownMakes.join(', ') || 'none'}`,
    );
    for (const make of unknownMakes) {
      addError(result, make, 'Make is not in data/brands.json, so it got the default tier and retention');
    }

    if (isUnchanged(current, observedAt, eurPln)) {
      result.skipped = built.cars.length;
      result.notes?.push('catalogue unchanged: same dataset date and EUR rate within tolerance');
      return finishResult(result);
    }

    if (ctx.dryRun) {
      result.updated = built.cars.length;
      result.notes?.push(`${built.cars.length} cars would be written (dry run, not written)`);
    } else {
      const change = await replaceCatalog(built.cars);
      result.updated = change.inserted + change.updated;
      result.notes?.push(
        `catalogue written: ${change.inserted} inserted, ${change.updated} updated, ${change.deactivated} deactivated`,
      );
    }
    // Set after the write: a step that fails must not look like one that skipped items.
    result.skipped = skippedByBuilder + dropped;
  } catch (error) {
    addError(result, 'catalogue', error);
  }
  return finishResult(result);
}
