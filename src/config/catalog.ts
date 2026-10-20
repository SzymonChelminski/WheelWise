import modelNames from '../../data/model-names.json';
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

/**
 * The dataset has no `Puissance_maximale` for electric cars. Their power is the
 * highest of: `Puissance_maximale` (when present), horsepower in the commercial
 * description, kilowatts in the description, and the rated power
 * (`Puissance_nominale_électrique`, often a continuous rating well below peak).
 */
export const ELECTRIC_ENERGY = 'ELECTRIC';
export const ELECTRIC_POWER_KW_RANGE = { min: 15, max: 1200 } as const;
export const HORSEPOWER_TO_KW = 0.7355;
/** Matches "204ch" and "325 ch". Used with `matchAll`, hence the `g` flag. */
export const DESCRIPTION_HORSEPOWER_PATTERN = /(?<![\d.,])(\d{2,4})\s*ch\b/gi;
/** Matches "239kW" and "160 kW" but not battery sizes such as "62kWh". */
export const DESCRIPTION_KILOWATT_PATTERN = /(?<![\d.,])(\d{2,4})\s*kw(?!h)/gi;

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
/**
 * Significant digits kept before rounding consumption, so that binary
 * floating-point noise does not decide a tie (the mean 11.15 is stored as
 * 11.149999999999999 and must round half-up to 11.2).
 */
export const CONSUMPTION_ROUNDING_SIGNIFICANT_DIGITS = 12;

/** Used for a make that is missing from data/brands.json. */
export const DEFAULT_BRAND_TIER: BrandTier = 'mainstream';
export const DEFAULT_VALUE_RETENTION: ValueRetention = 'average';

/** 1 kW = 1.35962 metric horsepower (KM); the UI converts with the same factor. */
export const KW_TO_METRIC_HORSEPOWER = 1.35962;

/**
 * A parenthesised group is a power marker such as "(101ch)" or "(94ch+24Kw)"
 * when its content, without spaces, matches this. The UI shows power separately.
 */
export const POWER_MARKER_PATTERN = /^\d+(?:ch|cv|kw)(?:\+\d+(?:ch|kw))*$/i;

/** French and technical words dropped from car names (whole words, any case). */
export const NAME_NOISE_PATTERN = /(?<![\p{L}\p{N}])(?:essence|gazole|facelift|bv(?:ma|[amr])\d*)(?![\p{L}\p{N}])/giu;

/** French words replaced by their English form in car names (whole words, any case). */
export const NAME_WORD_REPLACEMENTS: readonly { pattern: RegExp; replacement: string }[] = [
  { pattern: /(?<![\p{L}\p{N}])hybride(?![\p{L}\p{N}])/giu, replacement: 'Hybrid' },
  { pattern: /(?<![\p{L}\p{N}])[ée]lectrique(?![\p{L}\p{N}])/giu, replacement: 'Electric' },
];

/**
 * First whole word of the French equipment text that follows the model name
 * ("norme AP freins 15'' ..."); the name is cut there. "Classe" is a Mercedes
 * model name and is not listed.
 */
export const NAME_TAIL_START_PATTERN =
  /(?<![\p{L}\p{N}])(?:de|à|avec|et|pour|sans|norme|freins|système|moteur|nouvelle|rechargeable|famille|jantes|châssis|berline|classique|créative|pn|alt|opt)(?![\p{L}\p{N}])/iu;

/** Separators left dangling at the end of a name after the cut. */
export const NAME_TRAILING_SEPARATORS_PATTERN = /[\s/\-.,+]+$/;

/** A separator set apart by a space at the end of a name, left behind by a removed word. */
export const NAME_DETACHED_SEPARATORS_PATTERN = /\s+[/\-.,+]+$/;

/** An upper-case name part up to this many letters is an abbreviation and stays as it is. */
export const NAME_ABBREVIATION_MAX_LETTERS = 3;

/** Real brand spellings that the case rule breaks, keyed by the upper-case token. */
export const MODEL_NAME_EXCEPTIONS: Readonly<Record<string, string>> = modelNames;
