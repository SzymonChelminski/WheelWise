import {
  BODY_TYPE_MAP,
  CONSUMPTION_DECIMALS,
  CONSUMPTION_RANGE,
  DEFAULT_BRAND_TIER,
  DEFAULT_VALUE_RETENTION,
  DESCRIPTION_HORSEPOWER_PATTERN,
  DESCRIPTION_KILOWATT_PATTERN,
  ELECTRIC_CONSUMPTION_DIVISOR,
  ELECTRIC_ENERGY,
  ELECTRIC_POWER_KW_RANGE,
  ENERGY_TO_FUEL_TYPE,
  FRENCH_VAT_RATE,
  HORSEPOWER_TO_KW,
  PLN_PRICE_ROUNDING,
  POLISH_VAT_RATE,
  POWER_KW_RANGE,
  PRICE_EUR_RANGE,
  SEGMENT_MAP,
  TRANSMISSION_MAP,
  UNSUPPORTED_ENERGIES,
} from '@/config/catalog';
import type {
  BodyType,
  CarInput,
  FuelType,
  Segment,
  Transmission,
} from '@/lib/domain/types';
import type { AdemeRow, BrandInfo } from './ademe-schema';

export interface BuildOptions {
  eurPln: number;
  observedAt: string;
  sourceUrl: string;
  brands: Record<string, BrandInfo>;
}

export interface BuildResult {
  cars: CarInput[];
  skipped: { reason: string; count: number }[];
  unknownMakes: string[];
}

type Range = { readonly min: number; readonly max: number };

/** A dataset row that passed validation, with every value mapped and cleaned. */
interface MappedRow {
  make: string;
  model: string;
  description: string;
  bodyType: BodyType;
  segment: Segment;
  fuelType: FuelType;
  transmission: Transmission;
  powerKw: number;
  engineCc: number | null;
  priceEur: number;
  fuel: number | null;
  elec: number | null;
}

type MapResult = { row: MappedRow } | { skip: string };

const MOJIBAKE_MARKERS = /[ÃÂ]/;

/**
 * Re-decodes UTF-8 text that was read as Latin-1 ("CoupÃ©" -> "Coupé").
 * The dataset also holds "Ã " and "Â " where byte 0xA0 (the second byte of
 * "à" and of a no-break space) was turned into a plain space, so a space
 * right after a marker is restored to 0xA0 first. A marker at the very end
 * (its space was trimmed, as in "ENGAGEÂ Â Â") gets the same treatment.
 */
function repairEncoding(text: string): string {
  if (!MOJIBAKE_MARKERS.test(text)) return text;
  const latin1 = text.replace(/([ÃÂ])( |$)/g, '$1\u00a0');
  const bytes = new Uint8Array(latin1.length);
  for (let i = 0; i < latin1.length; i++) {
    const code = latin1.charCodeAt(i);
    if (code > 0xff) return text;
    bytes[i] = code;
  }
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return MOJIBAKE_MARKERS.test(decoded) ? text : decoded;
  } catch {
    return text;
  }
}

function cleanText(value: string): string {
  return repairEncoding(value).replace(/\s+/g, ' ').trim();
}

function lookupKey(value: string): string {
  return cleanText(value).toUpperCase();
}

function lookup<T>(table: Readonly<Record<string, T>>, value: string): T | undefined {
  const key = lookupKey(value);
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

function inRange(value: number | null, range: Range): value is number {
  return value !== null && value >= range.min && value <= range.max;
}

/** Mean of the dataset's minimum and maximum; the single value when one is missing. */
function meanOfMinMax(min: number | null, max: number | null): number | null {
  if (min === null) return max;
  if (max === null) return min;
  return (min + max) / 2;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function roundConsumption(value: number): number {
  const factor = 10 ** CONSUMPTION_DECIMALS;
  return Math.round(value * factor) / factor;
}

function requiredConsumption(
  fuelType: FuelType,
  fuel: number | null,
  elec: number | null,
): boolean {
  switch (fuelType) {
    case 'ev':
      return inRange(elec, CONSUMPTION_RANGE.electricKwh100);
    case 'phev':
      return (
        inRange(fuel, CONSUMPTION_RANGE.phevFuelL100) &&
        inRange(elec, CONSUMPTION_RANGE.electricKwh100)
      );
    default:
      return inRange(fuel, CONSUMPTION_RANGE.fuelL100);
  }
}

function numbersIn(text: string, pattern: RegExp): number[] {
  return [...text.matchAll(pattern)].map((match) => Number(match[1]));
}

/** Power in kW before rounding; null when no source has a value. */
function resolvePowerKw(row: AdemeRow, isElectric: boolean): number | null {
  if (!isElectric) return row.Puissance_maximale;
  const description = cleanText(row.Description_Commerciale);
  const horsepower = maxOf(numbersIn(description, DESCRIPTION_HORSEPOWER_PATTERN));
  return maxOf([
    row.Puissance_maximale,
    horsepower === null ? null : horsepower * HORSEPOWER_TO_KW,
    maxOf(numbersIn(description, DESCRIPTION_KILOWATT_PATTERN)),
    row.Puissance_nominale_électrique,
  ]);
}

function mapRow(row: AdemeRow): MapResult {
  const price = row.Prix_véhicule;
  if (price === null || price === 0) return { skip: 'no-price' };
  if (!Number.isInteger(price) || !inRange(price, PRICE_EUR_RANGE)) {
    return { skip: 'price-out-of-range' };
  }

  const isElectric = lookupKey(row.Energie) === ELECTRIC_ENERGY;
  const powerKw = resolvePowerKw(row, isElectric);
  if (!inRange(powerKw, isElectric ? ELECTRIC_POWER_KW_RANGE : POWER_KW_RANGE)) {
    return { skip: 'no-power' };
  }

  const energy = lookupKey(row.Energie);
  if (UNSUPPORTED_ENERGIES.has(energy)) return { skip: 'unsupported-energy' };
  const fuelType = lookup(ENERGY_TO_FUEL_TYPE, row.Energie);
  if (!fuelType) return { skip: 'unknown-energy' };

  const bodyType = lookup(BODY_TYPE_MAP, row.Carrosserie);
  if (!bodyType) return { skip: 'unknown-body' };

  const segment = lookup(SEGMENT_MAP, row.Gamme);
  if (!segment) return { skip: 'unknown-range' };

  const transmission = lookup(TRANSMISSION_MAP, row.Type_de_boite);
  if (!transmission) return { skip: 'unknown-gearbox' };

  const fuel = meanOfMinMax(row.Conso_vitesse_mixte_Min, row.Conso_vitesse_mixte_Max);
  const rawElec = meanOfMinMax(row.Conso_elec_Min, row.Conso_elec_Max);
  const elec = rawElec === null ? null : rawElec / ELECTRIC_CONSUMPTION_DIVISOR;
  if (!requiredConsumption(fuelType, fuel, elec)) return { skip: 'no-consumption' };

  const cc = row.Cylindrée;
  return {
    row: {
      make: cleanText(row.Marque),
      model: cleanText(row.Modèle),
      description: cleanText(row.Description_Commerciale),
      bodyType,
      segment,
      fuelType,
      transmission,
      powerKw: Math.round(powerKw),
      engineCc: fuelType !== 'ev' && cc !== null && Number.isInteger(cc) && cc > 0 ? cc : null,
      priceEur: price,
      fuel: fuelType === 'ev' ? null : fuel,
      elec: fuelType === 'ev' || fuelType === 'phev' ? elec : null,
    },
  };
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareNullable(a: number | null, b: number | null): number {
  return (a ?? Infinity) - (b ?? Infinity) || 0;
}

/** Cheapest first; ties by lowest consumption, then description, then engine size. */
function compareRepresentative(a: MappedRow, b: MappedRow): number {
  return (
    a.priceEur - b.priceEur ||
    compareNullable(a.fuel, b.fuel) ||
    compareNullable(a.elec, b.elec) ||
    compareText(a.description, b.description) ||
    compareNullable(a.engineCc, b.engineCc)
  );
}

function groupKey(row: MappedRow): string {
  // Bi-fuel cars are listed twice (petrol mode and LPG mode) with different power.
  const power = row.fuelType === 'lpg' ? null : row.powerKw;
  return JSON.stringify([row.make, row.model, row.bodyType, row.fuelType, row.transmission, power]);
}

function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, separator: string, letter: string) => {
      return separator + letter.toUpperCase();
    });
}

function maxOf(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? Math.max(...present) : null;
}

interface DraftCar {
  car: CarInput;
  groupKey: string;
}

function buildCar(rows: MappedRow[], opts: BuildOptions, brand: BrandInfo | undefined): CarInput {
  const representative = [...rows].sort(compareRepresentative)[0];
  const { fuelType } = representative;
  const isLpg = fuelType === 'lpg';

  const powerKw = isLpg ? Math.max(...rows.map((row) => row.powerKw)) : representative.powerKw;
  const fuel = isLpg ? maxOf(rows.map((row) => row.fuel)) : representative.fuel;
  const { elec, priceEur } = representative;
  const make = brand?.displayName ?? titleCase(representative.make);

  const listPricePln = roundTo(
    (priceEur * opts.eurPln * (1 + POLISH_VAT_RATE)) / (1 + FRENCH_VAT_RATE),
    PLN_PRICE_ROUNDING,
  );

  return {
    slug: toSlug(
      [
        make,
        representative.model,
        representative.bodyType,
        fuelType,
        representative.transmission,
        `${powerKw}kw`,
      ].join('-'),
    ),
    make,
    model: representative.model,
    variant: representative.description,
    bodyType: representative.bodyType,
    segment: representative.segment,
    fuelType,
    transmission: representative.transmission,
    powerKw,
    engineCc: representative.engineCc,
    brandTier: brand?.tier ?? DEFAULT_BRAND_TIER,
    valueRetention: brand?.retention ?? DEFAULT_VALUE_RETENTION,
    priceEur,
    listPricePln,
    priceObservedAt: opts.observedAt,
    priceSourceUrl: opts.sourceUrl,
    fuelL100: fuel === null ? null : roundConsumption(fuel),
    electricKwh100: elec === null ? null : roundConsumption(elec),
  };
}

/** Makes slugs unique: the cheapest car keeps the plain slug, the others get -2, -3. */
function disambiguateSlugs(drafts: DraftCar[]): CarInput[] {
  const ordered = [...drafts].sort(
    (a, b) =>
      compareText(a.car.slug, b.car.slug) ||
      a.car.priceEur - b.car.priceEur ||
      compareText(a.car.variant, b.car.variant) ||
      compareText(a.groupKey, b.groupKey),
  );
  const seen = new Map<string, number>();
  return ordered.map(({ car }) => {
    const occurrence = (seen.get(car.slug) ?? 0) + 1;
    seen.set(car.slug, occurrence);
    return occurrence === 1 ? car : { ...car, slug: `${car.slug}-${occurrence}` };
  });
}

/**
 * Turns ADEME rows into catalogue cars (one per make, model, body, fuel,
 * transmission and power group). Pure and deterministic; output is sorted by slug.
 */
export function buildCatalog(rows: AdemeRow[], opts: BuildOptions): BuildResult {
  if (!Number.isFinite(opts.eurPln) || opts.eurPln <= 0) {
    throw new Error(`eurPln must be a positive number, got ${opts.eurPln}`);
  }

  const skippedCounts = new Map<string, number>();
  const groups = new Map<string, MappedRow[]>();
  const unknownMakes = new Set<string>();

  for (const row of rows) {
    const make = cleanText(row.Marque);
    if (!Object.hasOwn(opts.brands, make)) unknownMakes.add(make);

    const result = mapRow(row);
    if ('skip' in result) {
      skippedCounts.set(result.skip, (skippedCounts.get(result.skip) ?? 0) + 1);
      continue;
    }
    const key = groupKey(result.row);
    const group = groups.get(key);
    if (group) group.push(result.row);
    else groups.set(key, [result.row]);
  }

  const drafts: DraftCar[] = [...groups].map(([key, groupRows]) => {
    const make = groupRows[0].make;
    const brand = Object.hasOwn(opts.brands, make) ? opts.brands[make] : undefined;
    return { car: buildCar(groupRows, opts, brand), groupKey: key };
  });

  const cars = disambiguateSlugs(drafts).sort((a, b) => compareText(a.slug, b.slug));
  const skipped = [...skippedCounts]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => compareText(a.reason, b.reason));

  return { cars, skipped, unknownMakes: [...unknownMakes].sort(compareText) };
}
