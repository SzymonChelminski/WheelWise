import { z } from 'zod';
import { ASSUMPTION_LIMITS, DRIVER_AGE_BANDS } from './assumptions';
import type { Assumptions, CarInput, MarketPrice, MarketPrices } from './types';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const fuelTypeSchema = z.enum(['petrol', 'diesel', 'lpg', 'hybrid', 'phev', 'ev']);
const consumptionSchema = z.number().positive().finite().nullable();
const httpUrlSchema = z.url({ protocol: /^https?$/ });

export const carInputSchema = z
  .object({
    slug: z.string().regex(SLUG_PATTERN, 'slug must be lower-case ASCII kebab-case'),
    make: z.string().trim().min(1),
    model: z.string().trim().min(1),
    variant: z.string().trim().min(1),
    bodyType: z.enum([
      'sedan_hatchback',
      'estate',
      'suv',
      'coupe',
      'convertible',
      'mpv',
      'van',
    ]),
    segment: z.enum(['A', 'B', 'C', 'D', 'E', 'F']),
    fuelType: fuelTypeSchema,
    transmission: z.enum(['manual', 'automatic']),
    powerKw: z.number().positive().finite(),
    engineCc: z.int().positive().nullable(),
    brandTier: z.enum(['budget', 'mainstream', 'premium']),
    valueRetention: z.enum(['high', 'average', 'low']),
    priceEur: z.int().positive(),
    listPricePln: z.int().positive(),
    priceObservedAt: z.iso.date(),
    priceSourceUrl: httpUrlSchema,
    fuelL100: consumptionSchema,
    electricKwh100: consumptionSchema,
  })
  .superRefine((car, ctx) => {
    const needsFuel = car.fuelType !== 'ev';
    const needsElectricity = car.fuelType === 'ev' || car.fuelType === 'phev';

    if (needsFuel !== (car.fuelL100 !== null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fuelL100'],
        message: needsFuel
          ? `fuelL100 is required for ${car.fuelType}`
          : 'fuelL100 must be null for ev',
      });
    }
    if (needsElectricity !== (car.electricKwh100 !== null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['electricKwh100'],
        message: needsElectricity
          ? `electricKwh100 is required for ${car.fuelType}`
          : `electricKwh100 must be null for ${car.fuelType}`,
      });
    }
  }) satisfies z.ZodType<CarInput>;

export const carCatalogSchema = z.array(carInputSchema).superRefine((cars, ctx) => {
  const seen = new Set<string>();
  cars.forEach((car, index) => {
    if (seen.has(car.slug)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'slug'],
        message: `duplicate slug "${car.slug}"`,
      });
    }
    seen.add(car.slug);
  });
});

export const marketPriceSchema = z.object({
  key: z.enum(['petrol', 'diesel', 'lpg', 'electricity', 'eur_pln']),
  pricePln: z.number().positive().finite(),
  observedAt: z.iso.date(),
  source: z.string().min(1),
  sourceUrl: httpUrlSchema,
}) satisfies z.ZodType<MarketPrice>;

/** The four prices the cost engine needs, keyed by `MarketPriceKey`. */
export const marketPricesSchema = z.object({
  petrol: marketPriceSchema,
  diesel: marketPriceSchema,
  lpg: marketPriceSchema,
  electricity: marketPriceSchema,
}) satisfies z.ZodType<MarketPrices>;

export const assumptionsSchema = z.object({
  annualMileageKm: z
    .int()
    .min(ASSUMPTION_LIMITS.annualMileageKm.min)
    .max(ASSUMPTION_LIMITS.annualMileageKm.max),
  ownershipYears: z
    .int()
    .min(ASSUMPTION_LIMITS.ownershipYears.min)
    .max(ASSUMPTION_LIMITS.ownershipYears.max),
  insurance: z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('estimate'),
      driverAgeBand: z.enum(DRIVER_AGE_BANDS),
      coverage: z.enum(['oc', 'oc_ac']),
    }),
    z.object({
      mode: z.literal('custom'),
      annualPremiumPln: z
        .number()
        .min(ASSUMPTION_LIMITS.annualPremiumPln.min)
        .max(ASSUMPTION_LIMITS.annualPremiumPln.max),
    }),
  ]),
}) satisfies z.ZodType<Assumptions>;
