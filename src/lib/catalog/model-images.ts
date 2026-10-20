import { z } from 'zod';
import type { CarPhotoData } from '@/components/ui/CarPhoto';
import type { Car } from '@/lib/domain/types';
import modelImages from '../../../data/model-images.json';
import { toSlug } from './build-catalog';

const photoSchema = z.object({
  sources: z.array(
    z.object({ width: z.union([z.literal(500), z.literal(960), z.literal(1280)]), url: z.url() }),
  ),
  width: z.number().positive(),
  height: z.number().positive(),
  author: z.string().max(120),
  license: z.string().min(1),
  licenseUrl: z.string().nullable(),
  sourceUrl: z.url(),
}) satisfies z.ZodType<CarPhotoData>;

// Resolved ahead of time by `npm run images:build`; the site never calls Wikimedia itself.
const images = z.record(z.string(), photoSchema.nullable()).parse(modelImages);

/** One photo per model: "make/model" as slugs, for example "renault/clio". */
export function modelKey(car: Pick<Car, 'make' | 'model'>): string {
  return `${toSlug(car.make)}/${toSlug(car.model)}`;
}

/** The photo of the car's model; null when the model has none or is newer than the photo list. */
export function getModelImage(car: Pick<Car, 'make' | 'model'>): CarPhotoData | null {
  const key = modelKey(car);
  return Object.hasOwn(images, key) ? images[key] : null;
}
