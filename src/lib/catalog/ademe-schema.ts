import { z } from 'zod';
import type { BrandTier, ValueRetention } from '@/lib/domain/types';

const nullableNumber = z.number().nullable();

/** One version of a car in the ADEME "Car Labelling" dataset. Unknown extra fields are ignored. */
export const ademeRowSchema = z.object({
  Marque: z.string(),
  Modèle: z.string(),
  Description_Commerciale: z.string(),
  Energie: z.string(),
  Carrosserie: z.string(),
  Gamme: z.string(),
  Cylindrée: nullableNumber,
  Puissance_maximale: nullableNumber,
  Type_de_boite: z.string(),
  Conso_vitesse_mixte_Min: nullableNumber,
  Conso_vitesse_mixte_Max: nullableNumber,
  Conso_elec_Min: nullableNumber,
  Conso_elec_Max: nullableNumber,
  Prix_véhicule: nullableNumber,
});

export type AdemeRow = z.infer<typeof ademeRowSchema>;

export interface BrandInfo {
  displayName: string;
  tier: BrandTier;
  retention: ValueRetention;
}

export const brandInfoSchema = z.object({
  displayName: z.string().trim().min(1),
  tier: z.enum(['budget', 'mainstream', 'premium']),
  retention: z.enum(['high', 'average', 'low']),
}) satisfies z.ZodType<BrandInfo>;

/** Contents of `data/brands.json`, keyed by the dataset's `Marque` value. */
export const brandsSchema = z.record(z.string(), brandInfoSchema);
