import { cacheLife, cacheTag } from 'next/cache';
import {
  getActiveCars,
  getCarBySlug,
  getLastRefreshRun,
  getMarketPrices,
} from '@/db/repositories';
import type { Car, MarketPrices } from '@/lib/domain/types';

export interface Catalog {
  cars: Car[];
  prices: MarketPrices;
  /** Finish time (ISO) of the last successful refresh run, or null when none has run. */
  lastRefresh: string | null;
}

/** The whole catalogue with the market prices the cost engine needs. */
export async function getCatalog(): Promise<Catalog> {
  'use cache';
  cacheTag('catalog');
  cacheLife('hours');

  const [cars, prices, lastRun] = await Promise.all([
    getActiveCars(),
    getMarketPrices(),
    getLastRefreshRun(),
  ]);
  return { cars, prices, lastRefresh: lastRun?.finishedAt ?? null };
}

export async function getCar(slug: string): Promise<Car | null> {
  'use cache';
  cacheTag('catalog');
  cacheLife('hours');

  return getCarBySlug(slug);
}
