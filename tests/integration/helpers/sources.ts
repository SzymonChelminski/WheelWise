import { readFileSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import type { AdemeRow } from '@/lib/catalog';
import { bytesReply, jsonReply, type Reply } from './fake-fetch';

// Addresses of the external sources, written out here on purpose: when an address
// in the application changes, the fake `fetch` has no answer for it and the tests fail.

const ADEME_API = 'https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling';

export const ADEME_FIELDS = [
  'Marque',
  'Modèle',
  'Description_Commerciale',
  'Energie',
  'Carrosserie',
  'Gamme',
  'Cylindrée',
  'Puissance_maximale',
  'Puissance_nominale_électrique',
  'Type_de_boite',
  'Conso_vitesse_mixte_Min',
  'Conso_vitesse_mixte_Max',
  'Conso_elec_Min',
  'Conso_elec_Max',
  'Prix_véhicule',
] as const;

export const URLS = {
  nbpCurrent: 'https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json',
  nbpRange: (from: string, to: string) =>
    `https://api.nbp.pl/api/exchangerates/rates/a/eur/${from}/${to}/?format=json`,
  oilBulletinFile:
    'https://energy.ec.europa.eu/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en',
  oilBulletinPage: 'https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en',
  eurostat:
    'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204' +
    '?format=JSON&geo=PL&currency=NAC&tax=I_TAX&nrg_cons=KWH2500-4999&lastTimePeriod=2',
  ademeMetadata: ADEME_API,
  ademeRows: `${ADEME_API}/lines?${new URLSearchParams({ size: '1000', select: ADEME_FIELDS.join(',') })}`,
  ademePage: 'https://data.ademe.fr/datasets/ademe-car-labelling',
} as const;

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const root = process.cwd();

export function readRecorded(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(root, 'tests', 'fixtures', relativePath), 'utf8'));
}

export function readRecordedBytes(relativePath: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(root, 'tests', 'fixtures', relativePath)));
}

// ---------------------------------------------------------------------------
// Exchange rate (NBP)
// ---------------------------------------------------------------------------

/** Recorded on 2026-10-11: rate 4.3775 published on 2026-10-09. */
export const nbpCurrentReply = (): Reply => jsonReply(readRecorded('nbp/current-rate.json'));

/** Recorded date ranges: "2026-09-29_2026-10-05", "2026-09-28_2026-10-04", "2026-10-05_2026-10-11". */
export const nbpRangeReply = (range: string): Reply => jsonReply(readRecorded(`nbp/range-${range}.json`));

/** A response in the shape of the NBP API with the given rates. */
export function nbpBody(rates: { effectiveDate: string; mid: number }[]): unknown {
  return {
    table: 'A',
    currency: 'euro',
    code: 'EUR',
    rates: rates.map((rate, index) => ({ no: `${index + 1}/A/NBP/2026`, ...rate })),
  };
}

/** Answers for the range requests the steps make on the fixed test date and for the recorded bulletin. */
export function nbpRoutes(): Record<string, Reply> {
  return {
    [URLS.nbpCurrent]: nbpCurrentReply(),
    [URLS.nbpRange('2026-09-29', '2026-10-05')]: nbpRangeReply('2026-09-29_2026-10-05'),
    [URLS.nbpRange('2026-10-05', '2026-10-11')]: nbpRangeReply('2026-10-05_2026-10-11'),
  };
}

// ---------------------------------------------------------------------------
// Fuel prices (Weekly Oil Bulletin)
// ---------------------------------------------------------------------------

/** The file as downloaded on 2026-10-12: bulletin of 2026-10-05, prices in EUR per 1000 litres. */
export const recordedBulletinReply = (): Reply =>
  bytesReply(readRecordedBytes('oil-bulletin/latest-prices-with-taxes.xlsx'), XLSX_TYPE);

export interface BulletinOptions {
  date?: Date | string | number | null;
  currency?: string;
  /** Prices of the Poland row in EUR per 1000 litres; `null` leaves the cell empty. */
  petrol?: number | null;
  diesel?: number | null;
  lpg?: number | null;
  units?: { petrol?: string; diesel?: string; lpg?: string };
  headers?: { petrol?: string; diesel?: string; lpg?: string | null };
  country?: string | null;
}

/** A workbook with the layout of the real file and the given values for Poland. */
export async function buildBulletin(options: BulletinOptions = {}): Promise<Uint8Array> {
  const {
    date = new Date('2026-10-05T00:00:00Z'),
    currency = 'in EUR',
    petrol = 1500,
    diesel = 1700,
    lpg = 750,
    units = {},
    headers = {},
    country = 'Poland',
  } = options;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  const header = [
    currency,
    headers.petrol ?? 'Euro-super 95  (I)',
    headers.diesel ?? 'Gas oil automobile Automotive gas oil Dieselkraftstoff (I)',
    ' Gas oil de chauffage Heating gas oil Heizöl (II)',
  ];
  if (headers.lpg !== null) header.push(headers.lpg ?? 'GPL pour moteur LPG motor fuel');
  sheet.addRow(header);
  sheet.addRow([date, units.petrol ?? '1000 l', units.diesel ?? '1000 l', '1000 l', units.lpg ?? '1000 l']);
  sheet.addRow(['Austria', 1837, 2138, 1799.99, null]);
  sheet.addRow(['Germany', 2196, 2254, 1726.4, 1049]);
  if (country !== null) sheet.addRow([country, petrol, diesel, 1662.77, lpg]);
  sheet.addRow(['Portugal', 2081, 2155, 2204, 922]);

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function bulletinReply(options: BulletinOptions = {}): Promise<Reply> {
  return bytesReply(await buildBulletin(options), XLSX_TYPE);
}

// ---------------------------------------------------------------------------
// Electricity price (Eurostat)
// ---------------------------------------------------------------------------

/** Recorded on 2026-10-12: 1.1505 for 2025-S2 and 1.2724 for 2026-S1. */
export const eurostatReply = (): Reply => jsonReply(readRecorded('eurostat/electricity-pl.json'));

/** A response in the JSON-stat shape of the recorded one, with the given periods. */
export function eurostatBody(
  periods: Record<string, number | null | undefined>,
  options: { asArray?: boolean; geoCount?: number } = {},
): unknown {
  const names = Object.keys(periods);
  const sparse: Record<string, number | null> = {};
  names.forEach((name, index) => {
    const value = periods[name];
    if (value !== undefined) sparse[String(index)] = value;
  });
  return {
    version: '2.0',
    class: 'dataset',
    id: ['freq', 'siec', 'nrg_cons', 'unit', 'tax', 'currency', 'geo', 'time'],
    size: [1, 1, 1, 1, 1, 1, options.geoCount ?? 1, names.length],
    value: options.asArray ? names.map((name) => periods[name] ?? null) : sparse,
    dimension: {
      time: { category: { index: Object.fromEntries(names.map((name, index) => [name, index])) } },
    },
  };
}

// ---------------------------------------------------------------------------
// Car catalogue (ADEME)
// ---------------------------------------------------------------------------

interface Snapshot {
  dataUpdatedAt: string;
  rows: AdemeRow[];
}

let snapshot: Snapshot | undefined;

/** The committed copy of the whole dataset (3604 rows, data of 2026-09-14). */
export function datasetSnapshot(): Snapshot {
  snapshot ??= JSON.parse(
    readFileSync(path.join(root, 'data', 'fixtures', 'ademe-snapshot.json'), 'utf8'),
  ) as Snapshot;
  return snapshot;
}

/** The live API leaves out a key whose value is empty. */
export function asApiRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null));
}

export const ademeNextUrl = (after: number) => `${URLS.ademeRows}&after=${after}`;

export interface AdemeOptions {
  rows?: unknown[];
  pageSize?: number;
  dataUpdatedAt?: string;
  /** The `total` the first page reports; the real row count by default. */
  total?: number;
}

/**
 * Answers of the dataset API: the metadata, then the rows in pages. Every page
 * but the last one carries a `next` link, and the first one carries `total`.
 */
export function ademeRoutes(options: AdemeOptions = {}): Record<string, Reply> {
  const {
    rows = datasetSnapshot().rows.map(asApiRow),
    pageSize = 1000,
    dataUpdatedAt = '2026-09-14T23:00:09.295Z',
    total = rows.length,
  } = options;

  const routes: Record<string, Reply> = {
    [URLS.ademeMetadata]: jsonReply({
      ...(readRecorded('ademe/metadata.json') as Record<string, unknown>),
      dataUpdatedAt,
    }),
  };
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  for (let page = 0; page < pageCount; page += 1) {
    const start = page * pageSize;
    const end = start + pageSize;
    routes[page === 0 ? URLS.ademeRows : ademeNextUrl(start)] = jsonReply({
      ...(page === 0 ? { total } : {}),
      ...(end < rows.length ? { next: ademeNextUrl(end) } : {}),
      results: rows.slice(start, end),
    });
  }
  return routes;
}

/** Answers for every source of the daily job, all from recorded data. */
export function allSourceRoutes(): Record<string, Reply> {
  return {
    ...nbpRoutes(),
    [URLS.oilBulletinFile]: recordedBulletinReply(),
    [URLS.eurostat]: eurostatReply(),
    ...ademeRoutes(),
  };
}
