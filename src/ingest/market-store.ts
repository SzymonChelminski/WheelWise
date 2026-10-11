import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { upsertMarketPrice } from '@/db/repositories';
import { marketPrices } from '@/db/schema';
import type { MarketPrice } from '@/lib/domain/types';
import { addError, type JobContext, type SourceResult } from './types';

/** The stored observation date (`YYYY-MM-DD`) of a market price, or `null`. */
export async function getStoredObservedAt(key: MarketPrice['key']): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ observedAt: marketPrices.observedAt })
    .from(marketPrices)
    .where(eq(marketPrices.key, key))
    .limit(1);
  return row?.observedAt ?? null;
}

/**
 * Write a price unless the stored one is as new or newer. Counts the outcome in
 * `result`. A dry run counts what it would write and writes nothing. A failed
 * write is an error on this key only.
 */
export async function saveIfNewer(
  ctx: JobContext,
  result: SourceResult,
  price: MarketPrice,
  label: string,
): Promise<void> {
  try {
    const stored = await getStoredObservedAt(price.key);
    if (stored !== null && stored >= price.observedAt) {
      result.skipped += 1;
      result.notes?.push(`${label}: unchanged (stored ${stored}, source ${price.observedAt})`);
      return;
    }
    if (!ctx.dryRun) await upsertMarketPrice(price);
    result.updated += 1;
    result.notes?.push(`${label}${ctx.dryRun ? ' (dry run, not written)' : ''}`);
  } catch (error) {
    addError(result, price.key, error);
  }
}
