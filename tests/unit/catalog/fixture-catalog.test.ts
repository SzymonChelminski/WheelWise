import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ademeRowSchema, brandsSchema, buildCatalog, type AdemeRow } from '@/lib/catalog';
import { calculateCosts } from '@/lib/costs';
import { carInputSchema, marketPriceSchema } from '@/lib/domain/schemas';
import type { CarInput, MarketPrice, MarketPrices } from '@/lib/domain/types';
import { makeAssumptions } from '../helpers/cars';

// The data files committed with the application: the copy of the source dataset,
// the brand data, and the catalogue and prices that are loaded when no database is configured.

function readData<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'data', relativePath), 'utf8')) as T;
}

const snapshot = readData<{ dataUpdatedAt: string; rows: unknown[] }>('fixtures/ademe-snapshot.json');
const cars = readData<CarInput[]>('fixtures/cars.json');
const brands = brandsSchema.parse(readData<unknown>('brands.json'));
const marketPrices = readData<MarketPrice[]>('fixtures/market-prices.json');

const rows = snapshot.rows as AdemeRow[];
const bySlug = new Map(cars.map((car) => [car.slug, car]));

function car(slug: string): CarInput {
  const found = bySlug.get(slug);
  if (!found) throw new Error(`The committed catalogue has no car "${slug}"`);
  return found;
}

function countBy(key: keyof CarInput): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of cars) counts[String(entry[key])] = (counts[String(entry[key])] ?? 0) + 1;
  return counts;
}

/** Mean of the dataset's minimum and maximum consumption of a row. */
const meanFuel = (row: AdemeRow) =>
  ((row.Conso_vitesse_mixte_Min ?? 0) + (row.Conso_vitesse_mixte_Max ?? 0)) / 2;

describe('committed dataset copy', () => {
  it('holds at least 3000 rows and the date of the data', () => {
    expect(snapshot.rows.length).toBeGreaterThanOrEqual(3000);
    expect(snapshot.rows).toHaveLength(3604);
    expect(snapshot.dataUpdatedAt).toBe('2026-09-14T23:00:09.295Z');
  });

  it('every row passes the row schema', () => {
    const invalid = snapshot.rows.filter((row) => !ademeRowSchema.safeParse(row).success);
    expect(invalid).toEqual([]);
  });

  it('every make of the dataset is in the brand data', () => {
    const makes = [...new Set(rows.map((row) => row.Marque.trim()))].sort();
    expect(makes).toHaveLength(37);
    expect(makes.filter((make) => !Object.hasOwn(brands, make))).toEqual([]);
  });

  it('the brand data spells the makes as agreed', () => {
    expect(brands['B.M.W.']).toEqual({ displayName: 'BMW', tier: 'premium', retention: 'average' });
    expect(brands['MERCEDES'].displayName).toBe('Mercedes-Benz');
    expect(brands['CITROEN']).toEqual({ displayName: 'Citroën', tier: 'mainstream', retention: 'low' });
    expect(brands['SKODA'].displayName).toBe('Škoda');
    expect(brands['DACIA']).toEqual({ displayName: 'Dacia', tier: 'budget', retention: 'high' });
    expect(brands['TOYOTA']).toEqual({ displayName: 'Toyota', tier: 'mainstream', retention: 'high' });
  });
});

describe('committed catalogue', () => {
  it('equals the catalogue rebuilt from the dataset copy at the rate 4.30', () => {
    const rebuilt = buildCatalog(
      snapshot.rows.map((row) => ademeRowSchema.parse(row)),
      {
        eurPln: 4.3,
        observedAt: '2026-09-14',
        sourceUrl: 'https://data.ademe.fr/datasets/ademe-car-labelling',
        brands,
      },
    );
    expect(rebuilt.cars).toEqual(cars);
    expect(rebuilt.unknownMakes).toEqual([]);
    expect(rebuilt.skipped).toEqual([
      { reason: 'price-out-of-range', count: 2 },
      { reason: 'unsupported-energy', count: 68 },
    ]);
  });

  it('holds 489 cars, within the expected size of 300 to 1500', () => {
    expect(cars.length).toBeGreaterThanOrEqual(300);
    expect(cars.length).toBeLessThanOrEqual(1500);
    expect(cars).toHaveLength(489);
  });

  it('every car passes the car schema', () => {
    const invalid = cars.filter((entry) => !carInputSchema.safeParse(entry).success);
    expect(invalid.map((entry) => entry.slug)).toEqual([]);
  });

  it('slugs are unique, lower-case ASCII kebab-case, and the file is sorted by slug', () => {
    const slugs = cars.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.filter((slug) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))).toEqual([]);
    expect(slugs).toEqual([...slugs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  it('contains all six fuel types', () => {
    expect(countBy('fuelType')).toEqual({
      petrol: 199,
      diesel: 118,
      hybrid: 80,
      ev: 48,
      phev: 40,
      lpg: 4,
    });
  });

  it('contains at least five body types', () => {
    expect(Object.keys(countBy('bodyType')).length).toBeGreaterThanOrEqual(5);
  });

  it('contains electric cars, a Tesla among them', () => {
    const electric = cars.filter((entry) => entry.fuelType === 'ev');
    expect(electric.length).toBeGreaterThanOrEqual(30);
    expect(electric.some((entry) => entry.make === 'Tesla')).toBe(true);
  });

  it('every electric car has electricity consumption of 8 to 40 kWh/100 km, no fuel consumption and no engine size', () => {
    const wrong = cars.filter(
      (entry) =>
        entry.fuelType === 'ev' &&
        !(
          entry.electricKwh100 !== null &&
          entry.electricKwh100 >= 8 &&
          entry.electricKwh100 <= 40 &&
          entry.fuelL100 === null &&
          entry.engineCc === null
        ),
    );
    expect(wrong.map((entry) => entry.slug)).toEqual([]);
  });

  it('the power of electric cars is resolved from the description and the rated power', () => {
    expect(car('tesla-model-3-sedan-hatchback-ev-automatic-88kw')).toMatchObject({
      variant: 'MODEL 3 (88Kw)',
      powerKw: 88,
    });
    expect(car('kia-ev6-suv-ev-automatic-239kw')).toMatchObject({
      variant: 'EV6 Moteur électrique 239kW (325ch)',
      powerKw: 239,
    });
    expect(car('dacia-spring-sedan-hatchback-ev-automatic-19kw')).toMatchObject({
      variant: 'SPRING (19Kw)',
      powerKw: 19,
    });
    expect(car('nissan-leaf-sedan-hatchback-ev-automatic-90kw').powerKw).toBe(90);
    const eSoul = cars.filter((entry) => entry.make === 'Kia' && /\(204ch\)/.test(entry.variant) && /e-soul/i.test(entry.variant));
    expect(eSoul.length).toBeGreaterThanOrEqual(1);
    for (const entry of eSoul) expect(entry.powerKw).toBe(150);
  });

  it('no text contains the marks of broken encoding', () => {
    const broken = cars.filter((entry) =>
      Object.values(entry).some((value) => typeof value === 'string' && /[ÃÂ]/.test(value)),
    );
    expect(broken.map((entry) => entry.slug)).toEqual([]);
  });

  it('no car name starts with its own make', () => {
    const datasetMakeOf = new Map(Object.entries(brands).map(([marque, info]) => [info.displayName, marque]));
    const repeated = cars.filter((entry) => {
      const name = entry.variant.toLowerCase();
      const candidates = [entry.make, datasetMakeOf.get(entry.make) ?? entry.make];
      return candidates.some((candidate) => name.startsWith(`${candidate.toLowerCase()} `));
    });
    expect(repeated.map((entry) => `${entry.make} | ${entry.variant}`)).toEqual([]);
  });

  it('no car name is empty or padded with spaces', () => {
    const wrong = cars.filter((entry) => entry.variant.trim() === '' || entry.variant !== entry.variant.trim());
    expect(wrong.map((entry) => entry.slug)).toEqual([]);
  });

  it('every price in PLN is the EUR price * 4.30 * 1.23 / 1.20, rounded to 100', () => {
    const wrong = cars.filter(
      (entry) => entry.listPricePln !== Math.round((entry.priceEur * 4.3 * 1.23) / 1.2 / 100) * 100,
    );
    expect(wrong.map((entry) => entry.slug)).toEqual([]);
    // One car by hand: 45 600 EUR -> 200 982 PLN -> 201 000 PLN.
    expect(car('alfa-romeo-giulia-sedan-hatchback-diesel-automatic-118kw')).toMatchObject({
      priceEur: 45600,
      listPricePln: 201000,
    });
  });

  it('every car carries the date of the data and the dataset page as its source', () => {
    const wrong = cars.filter(
      (entry) =>
        entry.priceObservedAt !== '2026-09-14' ||
        entry.priceSourceUrl !== 'https://data.ademe.fr/datasets/ademe-car-labelling',
    );
    expect(wrong.map((entry) => entry.slug)).toEqual([]);
  });

  it('the stored consumption rounds half up: the Porsche Macan with 280 kW uses 11.2 l/100 km', () => {
    expect(car('porsche-macan-suv-petrol-automatic-280kw').fuelL100).toBe(11.2);
  });
});

describe('committed catalogue - Dacia Sandero against the dataset rows', () => {
  const sandero = rows.filter((row) => row.Marque === 'DACIA' && row.Modèle === 'SANDERO');

  it('manual petrol versions of different power are separate cars priced at their cheapest row', () => {
    const manualPetrol = sandero.filter(
      (row) => row.Energie === 'ESSENCE' && row.Type_de_boite === 'MECANIQUE',
    );
    const cheapest = (power: number) =>
      Math.min(...manualPetrol.filter((row) => row.Puissance_maximale === power).map((row) => row.Prix_véhicule ?? Infinity));
    expect(cheapest(49)).toBe(10990);
    expect(cheapest(67)).toBe(14400);
    expect(car('dacia-sandero-sedan-hatchback-petrol-manual-49kw')).toMatchObject({
      variant: 'SANDERO (67ch)',
      powerKw: 49,
      priceEur: 10990,
    });
    expect(car('dacia-sandero-sedan-hatchback-petrol-manual-67kw')).toMatchObject({
      variant: 'SANDERO (91ch)',
      powerKw: 67,
      priceEur: 14400,
    });
  });

  it('the LPG version is one car with the higher power and the higher consumption of its two rows', () => {
    const lpgRows = sandero.filter((row) => row.Energie === 'ESS+G.P.L.');
    expect([...new Set(lpgRows.map((row) => row.Puissance_maximale))].sort()).toEqual([67, 74]);
    // LPG mode: mean of 7.047 and 7.322 = 7.1845; petrol mode: mean of 5.763 and 5.994 = 5.8785
    expect(Math.max(...lpgRows.map(meanFuel))).toBeCloseTo(7.1845, 4);

    const lpgCars = cars.filter((entry) => entry.make === 'Dacia' && entry.model === 'SANDERO' && entry.fuelType === 'lpg');
    expect(lpgCars).toHaveLength(1);
    expect(lpgCars[0]).toMatchObject({
      slug: 'dacia-sandero-sedan-hatchback-lpg-manual-74kw',
      variant: 'SANDERO (101ch)',
      powerKw: 74,
      fuelL100: 7.2,
      priceEur: 15350,
    });
  });

  it('the Dacia Jogger LPG car is named after its cheapest version and takes power and consumption from that version only', () => {
    expect(car('dacia-jogger-estate-lpg-manual-74kw')).toMatchObject({
      variant: 'JOGGER (101ch)',
      powerKw: 74,
      priceEur: 19148,
    });
  });
});

describe('committed market prices', () => {
  it('hold the four cost prices and the EUR rate 4.30, all marked as sample data', () => {
    for (const price of marketPrices) expect(marketPriceSchema.safeParse(price).success).toBe(true);
    expect(marketPrices.map((price) => price.key).sort()).toEqual([
      'diesel',
      'electricity',
      'eur_pln',
      'lpg',
      'petrol',
    ]);
    expect(marketPrices.find((price) => price.key === 'eur_pln')?.pricePln).toBe(4.3);
    expect(marketPrices.every((price) => price.source === 'fixture')).toBe(true);
  });

  it('every car of the catalogue yields finite, positive costs with these prices', () => {
    const prices = Object.fromEntries(
      marketPrices.filter((price) => price.key !== 'eur_pln').map((price) => [price.key, price]),
    ) as MarketPrices;
    expect(Object.keys(prices).sort()).toEqual(['diesel', 'electricity', 'lpg', 'petrol']);

    const assumptions = makeAssumptions();
    const wrong: string[] = [];
    cars.forEach((entry, index) => {
      const costs = calculateCosts({ id: index + 1, ...entry }, prices, assumptions);
      const numbers = [
        costs.purchasePricePln,
        costs.residualValuePln,
        costs.residualValuePct,
        costs.costPerKm,
        ...Object.values(costs.overOwnership),
        ...Object.values(costs.perYear),
        ...Object.values(costs.perMonth),
      ];
      const fine =
        numbers.every((value) => Number.isFinite(value) && value >= 0) &&
        costs.perMonth.total > 0 &&
        costs.perMonth.fuel > 0 &&
        costs.perMonth.depreciation > 0;
      if (!fine) wrong.push(entry.slug);
    });
    expect(wrong).toEqual([]);
  });
});
