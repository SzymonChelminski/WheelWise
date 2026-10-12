import { cacheLife, cacheTag } from 'next/cache';
import type { BodyType, FuelType, Transmission } from '@/lib/domain/types';
import { getCatalog } from './catalog';

/** What the browser needs to search cars and to print a name with its attributes. */
export interface SearchIndexEntry {
  slug: string;
  make: string;
  model: string;
  variant: string;
  bodyType: BodyType;
  fuelType: FuelType;
  transmission: Transmission;
  powerKw: number;
}

export async function getSearchIndex(): Promise<SearchIndexEntry[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife('hours');

  const { cars } = await getCatalog();
  return cars.map((car) => ({
    slug: car.slug,
    make: car.make,
    model: car.model,
    variant: car.variant,
    bodyType: car.bodyType,
    fuelType: car.fuelType,
    transmission: car.transmission,
    powerKw: car.powerKw,
  }));
}
