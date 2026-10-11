import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { upsertMarketPrice } from '@/db/repositories';
import { marketPrices } from '@/db/schema';
import type { MarketPrice } from '@/lib/domain/types';
import { FIXTURE_SOURCE } from '@/config/sources';
import { addError, type JobContext, type SourceResult } from './types';

async function getStoredRow(key: MarketPrice['key']) {
  const db = await getDb();
  const [row] = await db
    .select({ observedAt: marketPrices.observedAt, source: marketPrices.source })
    .from(marketPrices)
    .where(eq(marketPrices.key, key))
    .limit(1);
  return row ?? null;
}

/** The stored observation date (`YYYY-MM-DD`) of a market price, or `null`. */
export async function getStoredObservedAt(key: MarketPrice['key']): Promise<string | null> {
  return (await getStoredRow(key))?.observedAt ?? null;
}

/**
 * Write a price unless the stored one is as new or newer. A stored fixture row is
 * always replaced, because its date is invented. Counts the outcome in `result`.
 * A dry run counts what it would write and writes nothing. A failed write is an
 * error on this key only.
 */
export async function saveIfNewer(
  ctx: JobContext,
  result: SourceResult,
  price: MarketPrice,
  label: string,
): Promise<void> {
  try {
    const stored = await getStoredRow(price.key);
    const replacesFixture = stored?.source === FIXTURE_SOURCE;
    if (stored !== null && !replacesFixture && stored.observedAt >= price.observedAt) {
      result.skipped += 1;
      result.notes?.push(`${label}: unchanged (stored ${stored.observedAt}, source ${price.observedAt})`);
      return;
    }
    if (!ctx.dryRun) await upsertMarketPrice(price);
    result.updated += 1;
    result.notes?.push(
      `${label}${replacesFixture ? ' (replaces a fixture value)' : ''}${ctx.dryRun ? ' (dry run, not written)' : ''}`,
    );
  } catch (error) {
    addError(result, price.key, error);
  }
}
