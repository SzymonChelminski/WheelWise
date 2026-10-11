import type {
  BodyType,
  BrandTier,
  FuelType,
  Segment,
  Transmission,
  ValueRetention,
} from '@/lib/domain/types';

/** Dataset values are matched after trimming and upper-casing. */
export const ENERGY_TO_FUEL_TYPE: Readonly<Record<string, FuelType>> = {
  ESSENCE: 'petrol',
  GAZOLE: 'diesel',
  'GAZ+ELEC HNR': 'diesel',
  'ESS+G.P.L.': 'lpg',
  'ESS+ELEC HNR': 'hybrid',
  'ELEC+ESSENC HR': 'phev',
  ELECTRIC: 'ev',
};

/** Energy classes left out on purpose (E85, diesel plug-in hybrid). */
export const UNSUPPORTED_ENERGIES: ReadonlySet<string> = new Set([
  'SUPERETHANOL',
  'ELEC+GAZOLE HR',
]);

export const BODY_TYPE_MAP: Readonly<Record<string, BodyType>> = {
  BERLINE: 'sedan_hatchback',
  BREAK: 'estate',
  'TS TERRAINS/CHEMINS': 'suv',
  COUPE: 'coupe',
  CABRIOLET: 'convertible',
  MONOSPACE: 'mpv',
  'MONOSPACE COMPACT': 'mpv',
  MINISPACE: 'mpv',
  COMBISPACE: 'van',
  MINIBUS: 'van',
};

export const SEGMENT_MAP: Readonly<Record<string, Segment>> = {
  ECONOMIQUE: 'A',
  INFERIEURE: 'B',
  'MOYENNE INFERIEURE': 'C',
  'MOYENNE SUPERIEURE': 'D',
  SUPERIEURE: 'E',
  LUXE: 'F',
};

export const TRANSMISSION_MAP: Readonly<Record<string, Transmission>> = {
  MECANIQUE: 'manual',
  AUTOMATIQUE: 'automatic',
  'VARIATION CONTINUE': 'automatic',
  'VARIATION ELECTRIQUE': 'automatic',
};

export const PRICE_EUR_RANGE = { min: 5000, max: 1_000_000 } as const;
export const POWER_KW_RANGE = { min: 20, max: 1200 } as const;

/** Plausible WLTP combined consumption; rows outside the range are skipped. */
export const CONSUMPTION_RANGE = {
  fuelL100: { min: 2, max: 25 },
  phevFuelL100: { min: 0.3, max: 25 },
  electricKwh100: { min: 8, max: 40 },
} as const;

/**
 * `Conso_elec_Min` / `Conso_elec_Max` are published in Wh/km (snapshot
 * 2026-09-14: electric cars between 133 and 295, plug-in hybrids between
 * 129 and 261). The catalogue stores kWh/100 km, which is Wh/km divided by 10.
 */
export const ELECTRIC_CONSUMPTION_DIVISOR = 10;

export const FRENCH_VAT_RATE = 0.2;
export const POLISH_VAT_RATE = 0.23;
export const PLN_PRICE_ROUNDING = 100;
export const CONSUMPTION_DECIMALS = 1;

/** Used for a make that is missing from data/brands.json. */
export const DEFAULT_BRAND_TIER: BrandTier = 'mainstream';
export const DEFAULT_VALUE_RETENTION: ValueRetention = 'average';
