import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { ademeRowSchema, brandsSchema, buildCatalog } from '@/lib/catalog';
import { carCatalogSchema } from '@/lib/domain/schemas';

const EUR_PLN = 4.3;
const SOURCE_URL = 'https://data.ademe.fr/datasets/ademe-car-labelling';

const snapshotSchema = z.object({
  dataUpdatedAt: z.iso.datetime(),
  rows: z.array(ademeRowSchema),
});

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
}

function countBy<T>(items: T[], key: (item: T) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

function printCounts(title: string, counts: [string, number][]): void {
  console.log(`${title}:`);
  for (const [name, count] of counts) console.log(`  ${name}: ${count}`);
}

const snapshot = snapshotSchema.parse(readJson('data/fixtures/ademe-snapshot.json'));
const brands = brandsSchema.parse(readJson('data/brands.json'));

const result = buildCatalog(snapshot.rows, {
  eurPln: EUR_PLN,
  observedAt: snapshot.dataUpdatedAt.slice(0, 10),
  sourceUrl: SOURCE_URL,
  brands,
});
const cars = carCatalogSchema.parse(result.cars);

writeFileSync(
  resolve(process.cwd(), 'data/fixtures/cars.json'),
  `${JSON.stringify(cars, null, 2)}\n`,
  'utf8',
);

console.log(`Snapshot: ${snapshot.rows.length} rows, data updated ${snapshot.dataUpdatedAt}`);
console.log(`Cars: ${cars.length}`);
printCounts('Per make', countBy(cars, (car) => car.make));
printCounts('Per fuel type', countBy(cars, (car) => car.fuelType));
printCounts('Per body type', countBy(cars, (car) => car.bodyType));
printCounts(
  'Skipped rows by reason',
  result.skipped.map(({ reason, count }): [string, number] => [reason, count]),
);
console.log(`Unknown makes: ${result.unknownMakes.length ? result.unknownMakes.join(', ') : 'none'}`);
