import { z } from 'zod';
import { NBP } from '@/config/sources';
import { fetchJson, parseExternal } from '../http';
import { saveIfNewer } from '../market-store';
import { addError, finishResult, newResult, type JobContext, type SourceResult } from '../types';

const ratesSchema = z.object({
  table: z.literal('A'),
  code: z.literal('EUR'),
  rates: z
    .array(z.object({ effectiveDate: z.iso.date(), mid: z.number().finite() }))
    .min(1),
});

function assertEurPlnRange(mid: number): void {
  const { min, max } = NBP.eurPlnRange;
  if (mid < min || mid > max) {
    throw new Error(`EUR/PLN rate ${mid} is outside the valid range ${min}..${max}`);
  }
}

function latestRate(rates: z.infer<typeof ratesSchema>['rates']) {
  return rates.reduce((a, b) => (b.effectiveDate > a.effectiveDate ? b : a));
}

function subtractDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() - days);
  return result.toISOString().slice(0, 10);
}

/**
 * The NBP table A mid rate published on `date` (`YYYY-MM-DD`), or on the closest
 * earlier publication day. NBP publishes on working days only, so the query covers
 * the 7 days that end on `date`.
 */
export async function getEurRateOn(ctx: JobContext, date: string): Promise<number> {
  z.iso.date().parse(date);
  const url = NBP.rangeUrl(subtractDays(date, NBP.rangeDays - 1), date);
  const { rates } = parseExternal(ratesSchema, await fetchJson(ctx, url), 'NBP rate range');
  const { mid } = latestRate(rates);
  assertEurPlnRange(mid);
  return mid;
}

/** Step `exchange-rate`: the current EUR/PLN mid rate, stored as `eur_pln`. */
export async function exchangeRateStep(ctx: JobContext): Promise<SourceResult> {
  const result = newResult('exchange-rate');
  try {
    const { rates } = parseExternal(ratesSchema, await fetchJson(ctx, NBP.currentUrl), 'NBP current rate');
    const { effectiveDate, mid } = latestRate(rates);
    assertEurPlnRange(mid);
    await saveIfNewer(
      ctx,
      result,
      {
        key: 'eur_pln',
        pricePln: mid,
        observedAt: effectiveDate,
        source: NBP.source,
        sourceUrl: NBP.currentUrl,
      },
      `EUR/PLN ${mid} (${effectiveDate})`,
    );
  } catch (error) {
    addError(result, 'eur_pln', error);
  }
  return finishResult(result);
}
