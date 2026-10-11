import { z } from 'zod';
import { EUROSTAT, FUTURE_DATE_TOLERANCE_MS } from '@/config/sources';
import { fetchJson, parseExternal } from '../http';
import { saveIfNewer } from '../market-store';
import { addError, finishResult, newResult, type JobContext, type SourceResult } from '../types';

// JSON-stat 2.0 response of the dataset nrg_pc_204. The request fixes every dimension
// except time to one value, so a value's position equals the position of its period.
// Eurostat lists only the positions that have a value, so an absent position means no data.
const responseSchema = z.object({
  id: z.array(z.string()),
  size: z.array(z.number().int()),
  value: z.union([
    z.record(z.string(), z.number().nullable()),
    z.array(z.number().nullable()),
  ]),
  dimension: z.object({
    time: z.object({ category: z.object({ index: z.record(z.string(), z.number().int()) }) }),
  }),
});

const PERIOD = /^(\d{4})-S([12])$/;

/** First day of the half-year: S1 is January 1, S2 is July 1. */
function periodStart(period: string): string {
  const match = PERIOD.exec(period);
  if (!match) throw new Error(`Eurostat period "${period}" is not a half-year (YYYY-S1 or YYYY-S2)`);
  return `${match[1]}-${match[2] === '1' ? '01' : '07'}-01`;
}

function latestValue(data: z.infer<typeof responseSchema>): { period: string; price: number } {
  const otherDimensionsSingle = data.id.every(
    (name, index) => name === 'time' || data.size[index] === 1,
  );
  if (!otherDimensionsSingle) throw new Error('Eurostat response holds more than one series');

  // "YYYY-Sn" strings sort in time order.
  const periods = Object.entries(data.dimension.time.category.index).sort(([a], [b]) =>
    a < b ? 1 : -1,
  );
  for (const [period, position] of periods) {
    const price = (data.value as Record<string, number | null | undefined>)[String(position)];
    if (typeof price === 'number') return { period, price };
  }
  throw new Error('Eurostat response holds no value');
}

/** Step `electricity`: the latest household electricity price for Poland, in PLN per kWh. */
export async function electricityStep(ctx: JobContext): Promise<SourceResult> {
  const result = newResult('electricity');
  try {
    const data = parseExternal(responseSchema, await fetchJson(ctx, EUROSTAT.url), 'Eurostat response');
    const { period, price } = latestValue(data);
    const { min, max } = EUROSTAT.pricePlnRange;
    if (price < min || price > max) {
      throw new Error(`Electricity price ${price} PLN/kWh is outside the valid range ${min}..${max}`);
    }
    const observedAt = periodStart(period);
    if (Date.parse(`${observedAt}T00:00:00Z`) > ctx.now().getTime() + FUTURE_DATE_TOLERANCE_MS) {
      throw new Error(`Eurostat period ${period} is in the future`);
    }
    await saveIfNewer(
      ctx,
      result,
      {
        key: 'electricity',
        pricePln: price,
        observedAt,
        source: EUROSTAT.source,
        sourceUrl: EUROSTAT.url,
      },
      `electricity ${price} PLN/kWh (${period})`,
    );
  } catch (error) {
    addError(result, 'electricity', error);
  }
  return finishResult(result);
}
