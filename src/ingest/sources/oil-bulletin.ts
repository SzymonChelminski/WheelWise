/*
 * European Commission, Weekly Oil Bulletin, file "Prices with taxes latest prices".
 *
 * Address: OIL_BULLETIN.latestPricesUrl in src/config/sources.ts. It names the
 * document by id and has no date. The Commission replaces the file behind it every
 * week, so the adapter reads the bulletin date from the file, not from the address.
 * (Checked 2026-10-11: the page lists the file name "... - 2026-09-21.xlsx", but the
 * file behind the id holds the week of 2026-10-05.)
 *
 * Layout of the file (checked 2026-10-11, 17 KB, one sheet):
 *   Sheet "Sheet1".
 *   Row 1: A1 "in EUR" (currency of all prices), B1.. one header per product, for example
 *          B1 "Euro-super 95  (I)",
 *          C1 "Gas oil automobile Automotive gas oil Dieselkraftstoff (I)",
 *          D1 " Gas oil de chauffage Heating gas oil Heizöl (II)" (heating oil, not used),
 *          E1 and F1 heavy fuel oil (not used),
 *          G1 "GPL pour moteur LPG motor fuel".
 *   Row 2: A2 the bulletin date as a date cell (Monday of the price week, for example
 *          2026-10-05), B2.. the unit of the column: "1000 l" for fuels, "t" for heavy fuel oil.
 *   Rows 3..29: one row per EU member state. The country name in English is in column A
 *          ("Poland"). A product that a country does not report has an empty cell.
 *   Rows 30, 31: EU and euro area weighted averages (not used).
 * Prices are in EUR per 1000 litres, including taxes. Poland is published in EUR too, so
 * the adapter converts with the NBP rate of the bulletin date (see getEurRateOn).
 *
 * The adapter finds the columns by the header text (config: OIL_BULLETIN.headers) and the
 * row by the country name. It does not use fixed cell positions.
 */
import ExcelJS from 'exceljs';
import { inArray } from 'drizzle-orm';
import { FIXTURE_SOURCE, FUTURE_DATE_TOLERANCE_MS, OIL_BULLETIN } from '@/config/sources';
import { getDb } from '@/db/client';
import { marketPrices } from '@/db/schema';
import { fetchXlsx } from '../http';
import { saveIfNewer } from '../market-store';
import { addError, finishResult, newResult, type JobContext, type SourceResult } from '../types';
import { getEurRateOn } from './nbp';

type FuelKey = keyof typeof OIL_BULLETIN.headers;
const FUEL_KEYS = Object.keys(OIL_BULLETIN.headers) as FuelKey[];

const HEADER_SEARCH_ROWS = 10;

interface Bulletin {
  date: string;
  /** EUR per 1000 litres; `null` when the file has no value for Poland. */
  eurPer1000l: Record<FuelKey, number | null>;
}

function cellValue(cell: ExcelJS.Cell): string | number | Date | null {
  const read = (value: unknown): string | number | Date | null => {
    if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) return value;
    if (typeof value !== 'object' || value === null) return null;
    if ('result' in value) return read(value.result);
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part: { text: string }) => part.text).join('');
    }
    return null;
  };
  return read(cell.value);
}

const cellText = (cell: ExcelJS.Cell): string => {
  const value = cellValue(cell);
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
};

function toIsoDate(value: string | number | Date | null): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  throw new Error('Oil bulletin: the bulletin date cell is not a date');
}

async function parseBulletin(bytes: ArrayBuffer): Promise<Bulletin> {
  const workbook = new ExcelJS.Workbook();
  // exceljs 4.4 types `load` with the pre-generic `Buffer`, which @types/node 22 no longer matches.
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Oil bulletin: the workbook has no sheet');

  const columnCount = sheet.columnCount;
  const headerRowNumber = Array.from({ length: HEADER_SEARCH_ROWS }, (_, i) => i + 1).find(
    (rowNumber) =>
      Array.from({ length: columnCount }, (_, i) =>
        cellText(sheet.getCell(rowNumber, i + 1)),
      ).some((text) => OIL_BULLETIN.headers.petrol.test(text)),
  );
  if (headerRowNumber === undefined) {
    throw new Error('Oil bulletin: no header row with a Euro-super 95 column');
  }
  if (!OIL_BULLETIN.currencyHeader.test(cellText(sheet.getCell(headerRowNumber, 1)))) {
    throw new Error('Oil bulletin: the prices are not in EUR');
  }

  const columns = {} as Record<FuelKey, number>;
  for (const key of FUEL_KEYS) {
    const matches = Array.from({ length: columnCount }, (_, i) => i + 1).filter((column) =>
      OIL_BULLETIN.headers[key].test(cellText(sheet.getCell(headerRowNumber, column))),
    );
    if (matches.length !== 1) {
      throw new Error(`Oil bulletin: expected one ${key} column, found ${matches.length}`);
    }
    columns[key] = matches[0];
    const unit = cellText(sheet.getCell(headerRowNumber + 1, matches[0])).replace(/\s/g, '').toLowerCase();
    if (unit !== OIL_BULLETIN.unit) {
      throw new Error(`Oil bulletin: unit of the ${key} column is "${unit}", expected "${OIL_BULLETIN.unit}"`);
    }
  }

  const date = toIsoDate(cellValue(sheet.getCell(headerRowNumber + 1, 1)));

  let countryRow: number | undefined;
  for (let rowNumber = headerRowNumber + 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    if (cellText(sheet.getCell(rowNumber, 1)).toLowerCase() === OIL_BULLETIN.country) {
      countryRow = rowNumber;
      break;
    }
  }
  if (countryRow === undefined) throw new Error(`Oil bulletin: no row for ${OIL_BULLETIN.country}`);

  const eurPer1000l = {} as Bulletin['eurPer1000l'];
  for (const key of FUEL_KEYS) {
    const value = cellValue(sheet.getCell(countryRow, columns[key]));
    eurPer1000l[key] = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  }
  return { date, eurPer1000l };
}

/** True when every fuel row is a real (non-fixture) row at least as new as the bulletin. */
async function storedPricesAreCurrent(bulletinDate: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ observedAt: marketPrices.observedAt, source: marketPrices.source })
    .from(marketPrices)
    .where(inArray(marketPrices.key, FUEL_KEYS));
  return (
    rows.length === FUEL_KEYS.length &&
    rows.every((row) => row.source !== FIXTURE_SOURCE && row.observedAt >= bulletinDate)
  );
}

const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

/** Step `oil-bulletin`: petrol, diesel and LPG prices for Poland in PLN per litre. */
export async function oilBulletinStep(ctx: JobContext): Promise<SourceResult> {
  const result = newResult('oil-bulletin');
  try {
    const bulletin = await parseBulletin(await fetchXlsx(ctx, OIL_BULLETIN.latestPricesUrl));
    if (Date.parse(`${bulletin.date}T00:00:00Z`) > ctx.now().getTime() + FUTURE_DATE_TOLERANCE_MS) {
      throw new Error(`Oil bulletin: the bulletin date ${bulletin.date} is in the future`);
    }

    // The NBP request is not needed when the stored prices are already this recent.
    // Fixture rows are never current: they carry an invented date and are always replaced.
    if (await storedPricesAreCurrent(bulletin.date)) {
      result.skipped += FUEL_KEYS.length;
      result.notes?.push(`bulletin ${bulletin.date}: stored prices are as new or newer`);
      return finishResult(result);
    }

    const rate = await getEurRateOn(ctx, bulletin.date);
    const { min, max } = OIL_BULLETIN.pricePlnRange;
    const valid = new Map<FuelKey, { eur: number; pln: number }>();
    for (const key of FUEL_KEYS) {
      const eur = bulletin.eurPer1000l[key];
      if (eur === null) {
        addError(result, key, new Error(`The bulletin has no ${key} price for ${OIL_BULLETIN.country}`));
        continue;
      }
      const pln = round4((eur * rate) / 1000);
      if (pln < min || pln > max) {
        addError(result, key, new Error(`${key} price ${pln} PLN/l is outside the valid range ${min}..${max}`));
        continue;
      }
      valid.set(key, { eur, pln });
    }

    const petrol = valid.get('petrol');
    const lpg = valid.get('lpg');
    if (lpg && (!petrol || lpg.pln >= petrol.pln)) {
      const reason = petrol
        ? `is not lower than petrol ${petrol.pln} PLN/l`
        : 'cannot be checked against petrol, because the petrol price is invalid';
      addError(result, 'lpg', new Error(`LPG price ${lpg.pln} PLN/l ${reason}`));
      valid.delete('lpg');
    }

    for (const [key, { eur, pln }] of valid) {
      await saveIfNewer(
        ctx,
        result,
        {
          key,
          pricePln: pln,
          observedAt: bulletin.date,
          source: OIL_BULLETIN.source,
          sourceUrl: OIL_BULLETIN.pageUrl,
        },
        `${key} ${pln} PLN/l (${eur} EUR/1000 l x ${rate}, bulletin ${bulletin.date})`,
      );
    }
  } catch (error) {
    addError(result, 'oil-bulletin', error);
  }
  return finishResult(result);
}
