import { describe, expect, it } from 'vitest';
import { rankCars, type RankedCar, type RankingFilters, type RankingMetric } from '@/lib/costs';
import type { Car, MarketPrices } from '@/lib/domain/types';
import { custom, makeAssumptions, makeCar, makeCarOfFuel, makePrices } from '../helpers/cars';

const slugs = (ranked: RankedCar[]) => ranked.map((entry) => entry.car.slug);

// ---------------------------------------------------------------------------
// Order, tie-break and value of each of the nine metrics
// ---------------------------------------------------------------------------
//
// Every case ranks three cars: two identical reference cars ("a-tie", "b-tie") and one
// car "c-lowest" that is lower on the tested metric only by construction. The input order is
// b-tie, a-tie, c-lowest, so the expected order c-lowest, a-tie, b-tie proves both the
// ascending sort (c first although its slug sorts last) and the tie-break by slug (a before b
// although b comes first in the input).
//
// Reference car per month (cost model reference case): depreciation 800, fuel 487.5, insurance 208.25,
// service 100, parts 112.5, fees 5.15, maintenance 217.65, total 1713.4; price 100000; 6.0 l.

interface MetricCase {
  metric: RankingMetric;
  lowest: Partial<Car>;
  lowestValue: number;
  tieValue: number;
  prices?: MarketPrices;
  why: string;
}

const METRIC_CASES: MetricCase[] = [
  {
    metric: 'price',
    // Cheaper to buy, but segment F and premium, so more expensive to own.
    lowest: { listPricePln: 80000, segment: 'F', brandTier: 'premium' },
    lowestValue: 80000,
    tieValue: 100000,
    why: 'listPricePln',
  },
  {
    metric: 'totalCost',
    // Higher price (110000) but 3.0 l/100 km:
    // depreciation 52800 + fuel 14625 + insurance (3045 + 2750 * 3.78 = 13440) + service 6000
    // + parts 6750 + fees 309 = 93924 -> 1565.4 per month
    lowest: { listPricePln: 110000, fuelL100: 3.0 },
    lowestValue: 1565.4,
    tieValue: 1713.4,
    why: 'perMonth.total',
  },
  {
    metric: 'depreciation',
    // Higher price (110000), high retention: 110000 * 48% * 0.9 = 47520 -> 792 per month
    lowest: { listPricePln: 110000, valueRetention: 'high' },
    lowestValue: 792,
    tieValue: 800,
    why: 'perMonth.depreciation',
  },
  {
    metric: 'maintenance',
    // budget, segment A: service 900 * 5 + parts 15000 * 0.06 * 0.9 * 5 + fees 309
    // = 4500 + 4050 + 309 = 8859 -> 147.65 per month
    lowest: { listPricePln: 110000, brandTier: 'budget', segment: 'A' },
    lowestValue: 147.65,
    tieValue: 217.65,
    why: 'perMonth.maintenance',
  },
  {
    metric: 'service',
    // budget (900 per year -> 75 per month) but segment F, so parts and maintenance are higher
    lowest: { brandTier: 'budget', segment: 'F' },
    lowestValue: 75,
    tieValue: 100,
    why: 'perMonth.service',
  },
  {
    metric: 'parts',
    // segment A, premium: 15000 * 0.06 * 1.4 = 1260 per year -> 105 per month; service is higher
    lowest: { segment: 'A', brandTier: 'premium' },
    lowestValue: 105,
    tieValue: 112.5,
    why: 'perMonth.parts',
  },
  {
    metric: 'fuelCost',
    // lpg, 9.0 l/100 km at 3.10: 150 * 9 * 3.1 = 4185 per year -> 348.75 per month,
    // although the consumption (9.0) is higher than 6.0
    lowest: { fuelType: 'lpg', fuelL100: 9.0 },
    lowestValue: 348.75,
    tieValue: 487.5,
    why: 'perMonth.fuel',
  },
  {
    metric: 'fuelConsumption',
    // diesel, 5.9 l/100 km with diesel at 7.00: fuel cost 150 * 5.9 * 7 / 12 = 516.25 per month,
    // higher than 487.5, although the consumption is lower
    lowest: { fuelType: 'diesel', fuelL100: 5.9 },
    lowestValue: 5.9,
    tieValue: 6.0,
    prices: makePrices({ diesel: 7.0 }),
    why: 'fuelL100',
  },
  {
    metric: 'insurance',
    // 70 kW: OC 609 * 0.9 = 548.1; 5 * 548.1 + 9450 = 12190.5 -> 203.175 per month
    lowest: { powerKw: 70 },
    lowestValue: 203.175,
    tieValue: 208.25,
    why: 'perMonth.insurance',
  },
];

describe('rankCars - the nine metrics', () => {
  it('the metric cases cover all nine metrics exactly once', () => {
    expect(METRIC_CASES.map((c) => c.metric).sort()).toEqual(
      [
        'depreciation',
        'fuelConsumption',
        'fuelCost',
        'insurance',
        'maintenance',
        'parts',
        'price',
        'service',
        'totalCost',
      ].sort(),
    );
  });

  describe.each(METRIC_CASES)('metric $metric ($why)', (testCase) => {
    const cars = [
      makeCar({ id: 2, slug: 'b-tie' }),
      makeCar({ id: 1, slug: 'a-tie' }),
      makeCar({ id: 3, slug: 'c-lowest', ...testCase.lowest }),
    ];
    const rank = () =>
      rankCars(cars, testCase.prices ?? makePrices(), makeAssumptions(), testCase.metric, {});

    it(`${testCase.metric}: sorts ascending and breaks ties by slug`, () => {
      expect(slugs(rank())).toEqual(['c-lowest', 'a-tie', 'b-tie']);
    });

    it(`${testCase.metric}: value is ${testCase.why}`, () => {
      const ranked = rank();
      expect(ranked).toHaveLength(3);
      expect(ranked[0].value).toBeCloseTo(testCase.lowestValue, 6);
      expect(ranked[1].value).toBeCloseTo(testCase.tieValue, 6);
      expect(ranked[2].value).toBeCloseTo(testCase.tieValue, 6);
    });

    it(`${testCase.metric}: rank starts at 1 and increases by 1`, () => {
      expect(rank().map((entry) => entry.rank)).toEqual([1, 2, 3]);
    });
  });

  it('ties of four identical cars are ordered by slug for a cost metric', () => {
    const cars = ['zeta', 'alpha', 'mid', 'alpha-2'].map((slug, index) =>
      makeCar({ id: index + 1, slug }),
    );
    const ranked = rankCars(cars, makePrices(), makeAssumptions(), 'totalCost', {});
    expect(slugs(ranked)).toEqual(['alpha', 'alpha-2', 'mid', 'zeta']);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
  });

  it('each entry carries the car and its cost breakdown', () => {
    const car = makeCar({ slug: 'only-car' });
    const [entry] = rankCars([car], makePrices(), makeAssumptions(), 'price', {});
    expect(entry.car).toEqual(car);
    expect(entry.rank).toBe(1);
    expect(entry.costs.perMonth.total).toBeCloseTo(1713.4, 6);
    expect(entry.costs.overOwnership.total).toBeCloseTo(102804, 6);
  });

  it('an empty list of cars gives an empty ranking', () => {
    expect(rankCars([], makePrices(), makeAssumptions(), 'totalCost', {})).toEqual([]);
  });

  it('the input array is not reordered', () => {
    const cars = [
      makeCar({ id: 1, slug: 'expensive', listPricePln: 300000 }),
      makeCar({ id: 2, slug: 'cheap', listPricePln: 50000 }),
    ];
    rankCars(cars, makePrices(), makeAssumptions(), 'price', {});
    expect(cars.map((car) => car.slug)).toEqual(['expensive', 'cheap']);
  });
});

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const CATALOG: Car[] = [
  makeCarOfFuel('petrol', {
    id: 1,
    slug: 'skoda-octavia',
    make: 'Škoda',
    model: 'OCTAVIA',
    variant: 'Octavia Combi 1.5 TSI',
    bodyType: 'estate',
    segment: 'C',
    transmission: 'manual',
    listPricePln: 115000,
  }),
  makeCarOfFuel('petrol', {
    id: 2,
    slug: 'citroen-c3',
    make: 'Citroën',
    model: 'C3',
    variant: 'C3 PureTech You',
    bodyType: 'sedan_hatchback',
    segment: 'B',
    transmission: 'manual',
    listPricePln: 75000,
  }),
  makeCarOfFuel('ev', {
    id: 3,
    slug: 'bmw-i4',
    make: 'BMW',
    model: 'I4',
    variant: 'i4 eDrive40 Gran Coupé',
    bodyType: 'coupe',
    segment: 'D',
    transmission: 'automatic',
    listPricePln: 250000,
  }),
  makeCarOfFuel('hybrid', {
    id: 4,
    slug: 'toyota-corolla',
    make: 'Toyota',
    model: 'COROLLA',
    variant: 'Corolla 1.8 Hybrid',
    bodyType: 'sedan_hatchback',
    segment: 'C',
    transmission: 'automatic',
    listPricePln: 120000,
  }),
  makeCarOfFuel('lpg', {
    id: 5,
    slug: 'dacia-sandero',
    make: 'Dacia',
    model: 'SANDERO',
    variant: 'Sandero ECO-G 100',
    bodyType: 'sedan_hatchback',
    segment: 'B',
    transmission: 'manual',
    listPricePln: 70000,
  }),
  makeCarOfFuel('phev', {
    id: 6,
    slug: 'volvo-xc60',
    make: 'Volvo',
    model: 'XC60',
    variant: 'T6 Recharge Plus',
    bodyType: 'suv',
    segment: 'D',
    transmission: 'automatic',
    listPricePln: 300000,
  }),
  makeCarOfFuel('diesel', {
    id: 7,
    slug: 'skoda-kodiaq',
    make: 'Škoda',
    model: 'KODIAQ',
    variant: 'Kodiaq 2.0 TDI',
    bodyType: 'suv',
    segment: 'D',
    transmission: 'automatic',
    listPricePln: 200000,
  }),
];

// All seven cars by ascending price.
const ALL_BY_PRICE = [
  'dacia-sandero', // 70000
  'citroen-c3', // 75000
  'skoda-octavia', // 115000
  'toyota-corolla', // 120000
  'skoda-kodiaq', // 200000
  'bmw-i4', // 250000
  'volvo-xc60', // 300000
];

/** Slugs of the catalogue cars that pass the filters, in price order. */
function filtered(filters: RankingFilters): string[] {
  return slugs(rankCars(CATALOG, makePrices(), makeAssumptions(), 'price', filters));
}

describe('rankCars - filters, one at a time', () => {
  it('no filters returns every car', () => {
    expect(filtered({})).toEqual(ALL_BY_PRICE);
  });

  it('empty filter arrays mean no restriction', () => {
    expect(filtered({ makes: [], segments: [], bodyTypes: [], fuelTypes: [] })).toEqual(
      ALL_BY_PRICE,
    );
  });

  it('makes: exact match on the make', () => {
    expect(filtered({ makes: ['BMW'] })).toEqual(['bmw-i4']);
    expect(filtered({ makes: ['Škoda'] })).toEqual(['skoda-octavia', 'skoda-kodiaq']);
  });

  it('makes: the match is case-insensitive', () => {
    expect(filtered({ makes: ['bmw'] })).toEqual(['bmw-i4']);
    expect(filtered({ makes: ['dAcIa'] })).toEqual(['dacia-sandero']);
    expect(filtered({ makes: ['ŠKODA'] })).toEqual(['skoda-octavia', 'skoda-kodiaq']);
  });

  it('makes: several makes are combined with OR', () => {
    expect(filtered({ makes: ['dacia', 'VOLVO'] })).toEqual(['dacia-sandero', 'volvo-xc60']);
  });

  it('makes: a prefix of a make does not match', () => {
    expect(filtered({ makes: ['Dac'] })).toEqual([]);
    expect(filtered({ makes: ['Toyota Corolla'] })).toEqual([]);
  });

  it('makes: the match is exact apart from letter case, so a make without its diacritics does not match', () => {
    expect(filtered({ makes: ['skoda'] })).toEqual([]);
    expect(filtered({ makes: ['SKODA'] })).toEqual([]);
    expect(filtered({ makes: ['citroen'] })).toEqual([]);
    expect(filtered({ makes: ['škoda'] })).toEqual(['skoda-octavia', 'skoda-kodiaq']);
    expect(filtered({ makes: ['skoda', 'bmw'] })).toEqual(['bmw-i4']);
  });

  it('segments', () => {
    expect(filtered({ segments: ['B'] })).toEqual(['dacia-sandero', 'citroen-c3']);
    expect(filtered({ segments: ['C', 'B'] })).toEqual([
      'dacia-sandero',
      'citroen-c3',
      'skoda-octavia',
      'toyota-corolla',
    ]);
    expect(filtered({ segments: ['F'] })).toEqual([]);
  });

  it('bodyTypes', () => {
    expect(filtered({ bodyTypes: ['suv'] })).toEqual(['skoda-kodiaq', 'volvo-xc60']);
    expect(filtered({ bodyTypes: ['estate', 'coupe'] })).toEqual(['skoda-octavia', 'bmw-i4']);
    expect(filtered({ bodyTypes: ['van'] })).toEqual([]);
  });

  it('fuelTypes', () => {
    expect(filtered({ fuelTypes: ['petrol'] })).toEqual(['citroen-c3', 'skoda-octavia']);
    expect(filtered({ fuelTypes: ['ev', 'phev'] })).toEqual(['bmw-i4', 'volvo-xc60']);
    expect(filtered({ fuelTypes: ['lpg'] })).toEqual(['dacia-sandero']);
  });

  it('transmission', () => {
    expect(filtered({ transmission: 'manual' })).toEqual([
      'dacia-sandero',
      'citroen-c3',
      'skoda-octavia',
    ]);
    expect(filtered({ transmission: 'automatic' })).toEqual([
      'toyota-corolla',
      'skoda-kodiaq',
      'bmw-i4',
      'volvo-xc60',
    ]);
  });

  it('priceMin is inclusive', () => {
    expect(filtered({ priceMin: 250000 })).toEqual(['bmw-i4', 'volvo-xc60']);
    expect(filtered({ priceMin: 250001 })).toEqual(['volvo-xc60']);
  });

  it('priceMax is inclusive', () => {
    expect(filtered({ priceMax: 75000 })).toEqual(['dacia-sandero', 'citroen-c3']);
    expect(filtered({ priceMax: 74999 })).toEqual(['dacia-sandero']);
  });

  it('price range is inclusive on both ends', () => {
    expect(filtered({ priceMin: 75000, priceMax: 120000 })).toEqual([
      'citroen-c3',
      'skoda-octavia',
      'toyota-corolla',
    ]);
    expect(filtered({ priceMin: 75001, priceMax: 119999 })).toEqual(['skoda-octavia']);
  });

  it('priceMin 0 and a range without cars', () => {
    expect(filtered({ priceMin: 0 })).toEqual(ALL_BY_PRICE);
    expect(filtered({ priceMin: 130000, priceMax: 190000 })).toEqual([]);
  });
});

describe('rankCars - query', () => {
  it('query matches a substring of the make, the model or the variant', () => {
    expect(filtered({ query: 'Toyota' })).toEqual(['toyota-corolla']); // make
    expect(filtered({ query: 'XC60' })).toEqual(['volvo-xc60']); // model only (not in variant)
    expect(filtered({ query: 'PureTech' })).toEqual(['citroen-c3']); // variant
    expect(filtered({ query: 'octav' })).toEqual(['skoda-octavia']); // partial word
  });

  it('query is case-insensitive', () => {
    expect(filtered({ query: 'toyota' })).toEqual(['toyota-corolla']);
    expect(filtered({ query: 'TOYOTA' })).toEqual(['toyota-corolla']);
    expect(filtered({ query: 'xc60' })).toEqual(['volvo-xc60']);
    expect(filtered({ query: 'tdi' })).toEqual(['skoda-kodiaq']);
  });

  it('query without diacritics finds names with diacritics', () => {
    expect(filtered({ query: 'skoda' })).toEqual(['skoda-octavia', 'skoda-kodiaq']);
    expect(filtered({ query: 'SKODA' })).toEqual(['skoda-octavia', 'skoda-kodiaq']);
    expect(filtered({ query: 'citroen' })).toEqual(['citroen-c3']);
    expect(filtered({ query: 'coupe' })).toEqual(['bmw-i4']);
  });

  it('query with diacritics finds names with the same diacritics', () => {
    expect(filtered({ query: 'Škoda' })).toEqual(['skoda-octavia', 'skoda-kodiaq']);
    expect(filtered({ query: 'CITROËN' })).toEqual(['citroen-c3']);
    expect(filtered({ query: 'coupé' })).toEqual(['bmw-i4']);
  });

  it('query with diacritics finds names without them (the reverse)', () => {
    expect(filtered({ query: 'sándero' })).toEqual(['dacia-sandero']);
    expect(filtered({ query: 'tôyötà' })).toEqual(['toyota-corolla']);
  });

  it('query in decomposed form (letter + combining mark) matches', () => {
    // "citroe" + U+0308 COMBINING DIAERESIS + "n"
    expect(filtered({ query: 'citroën' })).toEqual(['citroen-c3']);
  });

  it('query requires every word', () => {
    expect(filtered({ query: 'skoda combi' })).toEqual(['skoda-octavia']);
    expect(filtered({ query: 'skoda tdi' })).toEqual(['skoda-kodiaq']);
    expect(filtered({ query: 'skoda hybrid' })).toEqual([]);
    expect(filtered({ query: 'toyota corolla 1.8 hybrid' })).toEqual(['toyota-corolla']);
    expect(filtered({ query: 'toyota corolla 1.8 diesel' })).toEqual([]);
  });

  it('query words may come in any order and from different fields', () => {
    expect(filtered({ query: 'combi skoda' })).toEqual(['skoda-octavia']);
    expect(filtered({ query: 'recharge volvo xc60' })).toEqual(['volvo-xc60']);
  });

  it('query words are separated by any whitespace; surrounding whitespace is ignored', () => {
    expect(filtered({ query: '  skoda \t  tdi  ' })).toEqual(['skoda-kodiaq']);
  });

  it('an empty or whitespace-only query means no restriction', () => {
    expect(filtered({ query: '' })).toEqual(ALL_BY_PRICE);
    expect(filtered({ query: '   ' })).toEqual(ALL_BY_PRICE);
  });

  it('a query that matches nothing gives an empty ranking', () => {
    expect(filtered({ query: 'lamborghini' })).toEqual([]);
  });

  it('query searches the make, the model and the variant only, not the slug', () => {
    // The slugs "volvo-xc60" and "skoda-kodiaq" exist, but no name contains these texts.
    expect(filtered({ query: 'volvo-xc60' })).toEqual([]);
    expect(filtered({ query: 'skoda-kodiaq' })).toEqual([]);
    expect(filtered({ query: 'dacia-sandero' })).toEqual([]);
    // The same words as separate words are found in the names.
    expect(filtered({ query: 'volvo xc60' })).toEqual(['volvo-xc60']);
  });

  it('query does not search the body type, the fuel type or the segment', () => {
    expect(filtered({ query: 'suv' })).toEqual([]);
    expect(filtered({ query: 'phev' })).toEqual([]);
    expect(filtered({ query: 'estate' })).toEqual([]);
    expect(filtered({ query: 'automatic' })).toEqual([]);
  });
});

describe('rankCars - combined filters', () => {
  it('segment + transmission + price + fuel types are combined with AND', () => {
    expect(
      filtered({
        segments: ['D'],
        transmission: 'automatic',
        priceMax: 250000,
        fuelTypes: ['diesel', 'ev'],
      }),
    ).toEqual(['skoda-kodiaq', 'bmw-i4']);
  });

  it('make + query', () => {
    expect(filtered({ makes: ['škoda'], query: 'tdi' })).toEqual(['skoda-kodiaq']);
    expect(filtered({ makes: ['škoda'], query: 'corolla' })).toEqual([]);
  });

  it('body type + segment + price range', () => {
    expect(
      filtered({
        bodyTypes: ['sedan_hatchback'],
        segments: ['B', 'C'],
        priceMin: 72000,
        priceMax: 120000,
      }),
    ).toEqual(['citroen-c3', 'toyota-corolla']);
  });

  it('all eight filters together', () => {
    expect(
      filtered({
        makes: ['toyota', 'dacia', 'citroën'],
        segments: ['C', 'B'],
        bodyTypes: ['sedan_hatchback'],
        fuelTypes: ['hybrid', 'lpg'],
        transmission: 'automatic',
        priceMin: 70000,
        priceMax: 120000,
        query: 'hybrid',
      }),
    ).toEqual(['toyota-corolla']);
  });

  it('one failing filter removes the car even when the others match', () => {
    expect(filtered({ makes: ['toyota'], fuelTypes: ['hybrid'], transmission: 'manual' })).toEqual(
      [],
    );
  });

  it('ranks are renumbered from 1 after filtering', () => {
    const ranked = rankCars(CATALOG, makePrices(), makeAssumptions(), 'price', {
      transmission: 'automatic',
    });
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
    expect(ranked.map((entry) => entry.value)).toEqual([120000, 200000, 250000, 300000]);
  });
});

// ---------------------------------------------------------------------------
// Fuel consumption ranking
// ---------------------------------------------------------------------------

describe('rankCars - fuelConsumption', () => {
  const cars: Car[] = [
    makeCarOfFuel('petrol', { id: 1, slug: 'fc-petrol', fuelL100: 6.0 }),
    makeCarOfFuel('diesel', { id: 2, slug: 'fc-diesel', fuelL100: 5.0 }),
    makeCarOfFuel('lpg', { id: 3, slug: 'fc-lpg', fuelL100: 8.0 }),
    makeCarOfFuel('hybrid', { id: 4, slug: 'fc-hybrid', fuelL100: 4.5 }),
    // The phev has the lowest litres value: it would be first if it were not excluded.
    makeCarOfFuel('phev', { id: 5, slug: 'fc-phev', fuelL100: 1.5, electricKwh100: 16 }),
    makeCarOfFuel('ev', { id: 6, slug: 'fc-ev-a', electricKwh100: 17 }),
    makeCarOfFuel('ev', { id: 7, slug: 'fc-ev-b', electricKwh100: 15 }),
  ];
  const rank = (filters: RankingFilters) =>
    rankCars(cars, makePrices(), makeAssumptions(), 'fuelConsumption', filters);

  it('without a fuel filter: phev and ev are excluded, the rest is ranked by l/100 km', () => {
    const ranked = rank({});
    expect(slugs(ranked)).toEqual(['fc-hybrid', 'fc-diesel', 'fc-petrol', 'fc-lpg']);
    expect(ranked.map((entry) => entry.value)).toEqual([4.5, 5.0, 6.0, 8.0]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
  });

  it("fuel filter exactly ['ev']: the evs are ranked by kWh/100 km", () => {
    const ranked = rank({ fuelTypes: ['ev'] });
    expect(slugs(ranked)).toEqual(['fc-ev-b', 'fc-ev-a']);
    expect(ranked.map((entry) => entry.value)).toEqual([15, 17]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2]);
  });

  it("fuel filter ['phev']: phev is excluded, the ranking is empty", () => {
    expect(rank({ fuelTypes: ['phev'] })).toEqual([]);
  });

  it("fuel filter ['ev', 'petrol']: ev is excluded because the filter is not exactly ['ev']", () => {
    const ranked = rank({ fuelTypes: ['ev', 'petrol'] });
    expect(slugs(ranked)).toEqual(['fc-petrol']);
    expect(ranked[0].value).toBe(6.0);
  });

  it("fuel filter ['phev', 'ev']: both are excluded", () => {
    expect(rank({ fuelTypes: ['phev', 'ev'] })).toEqual([]);
  });

  it("fuel filter ['phev', 'diesel']: only the diesel remains", () => {
    expect(slugs(rank({ fuelTypes: ['phev', 'diesel'] }))).toEqual(['fc-diesel']);
  });

  it('an empty fuel filter behaves like no filter (ev and phev excluded)', () => {
    expect(slugs(rank({ fuelTypes: [] }))).toEqual([
      'fc-hybrid',
      'fc-diesel',
      'fc-petrol',
      'fc-lpg',
    ]);
  });

  it("the ['ev'] ranking still applies the other filters", () => {
    const ranked = rankCars(
      [
        makeCarOfFuel('ev', { id: 1, slug: 'ev-cheap', electricKwh100: 19, listPricePln: 120000 }),
        makeCarOfFuel('ev', { id: 2, slug: 'ev-dear', electricKwh100: 14, listPricePln: 300000 }),
      ],
      makePrices(),
      makeAssumptions(),
      'fuelConsumption',
      { fuelTypes: ['ev'], priceMax: 200000 },
    );
    expect(slugs(ranked)).toEqual(['ev-cheap']);
    expect(ranked[0].value).toBe(19);
  });

  it('phev and ev stay in the rankings of the other metrics', () => {
    const ranked = rankCars(cars, makePrices(), makeAssumptions(), 'price', {});
    expect(ranked).toHaveLength(7);
    expect(slugs(ranked)).toContain('fc-phev');
    expect(slugs(ranked)).toContain('fc-ev-a');
  });
});

// ---------------------------------------------------------------------------
// Rankings react to the assumptions
// ---------------------------------------------------------------------------

describe('rankCars - reaction to assumptions', () => {
  // "thirsty": P = 100000, 9.0 l/100 km. "frugal": P = 130000, 4.0 l/100 km.
  // Both petrol, segment C, mainstream, average retention; custom premium 2000 per year; 5 years.
  //
  // 5 000 km (residual 62%):
  //   thirsty: 38000 + 14625 + 10000 + 6000 + 2250 + 309 = 71184 -> 1186.40 per month
  //   frugal:  49400 +  6500 + 10000 + 6000 + 2250 + 309 = 74459 -> 1240.9833 per month
  // 40 000 km (residual 27%, service x 2):
  //   thirsty: 73000 + 117000 + 10000 + 12000 + 18000 + 309 = 230309 -> 3838.4833 per month
  //   frugal:  94900 +  52000 + 10000 + 12000 + 18000 + 309 = 187209 -> 3120.15 per month
  const pair = [
    makeCar({ id: 1, slug: 'thirsty', listPricePln: 100000, fuelL100: 9.0 }),
    makeCar({ id: 2, slug: 'frugal', listPricePln: 130000, fuelL100: 4.0 }),
  ];

  it('at 5 000 km per year the cheaper, thirstier car has the lower total cost', () => {
    const ranked = rankCars(
      pair,
      makePrices(),
      custom(2000, { annualMileageKm: 5000 }),
      'totalCost',
      {},
    );
    expect(slugs(ranked)).toEqual(['thirsty', 'frugal']);
    expect(ranked[0].value).toBeCloseTo(1186.4, 6);
    expect(ranked[1].value).toBeCloseTo(1240.9833333333, 6);
  });

  it('at 40 000 km per year the order is reversed', () => {
    const ranked = rankCars(
      pair,
      makePrices(),
      custom(2000, { annualMileageKm: 40000 }),
      'totalCost',
      {},
    );
    expect(slugs(ranked)).toEqual(['frugal', 'thirsty']);
    expect(ranked[0].value).toBeCloseTo(3120.15, 6);
    expect(ranked[1].value).toBeCloseTo(3838.4833333333, 6);
  });

  it('the price ranking does not react to the mileage', () => {
    for (const annualMileageKm of [5000, 40000]) {
      const ranked = rankCars(
        pair,
        makePrices(),
        custom(2000, { annualMileageKm }),
        'price',
        {},
      );
      expect(slugs(ranked)).toEqual(['thirsty', 'frugal']);
    }
  });

  it('the insurance ranking reacts to the insurance assumptions', () => {
    // "strong-cheap": 200 kW, P = 60000. "weak-dear": 70 kW, P = 200000. One year of ownership.
    // OC only, 35-44:  609 * 1.25 = 761.25  against  609 * 0.9 = 548.1          -> weak-dear first
    // OC + AC, 35-44:  761.25 + 1500 = 2261.25  against  548.1 + 5000 = 5548.1  -> strong-cheap first
    const cars = [
      makeCar({ id: 1, slug: 'strong-cheap', powerKw: 200, listPricePln: 60000 }),
      makeCar({ id: 2, slug: 'weak-dear', powerKw: 70, listPricePln: 200000 }),
    ];
    const ocOnly = rankCars(
      cars,
      makePrices(),
      makeAssumptions({
        ownershipYears: 1,
        insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc' },
      }),
      'insurance',
      {},
    );
    expect(slugs(ocOnly)).toEqual(['weak-dear', 'strong-cheap']);
    expect(ocOnly[0].value).toBeCloseTo(548.1 / 12, 6);
    expect(ocOnly[1].value).toBeCloseTo(761.25 / 12, 6);

    const ocAc = rankCars(
      cars,
      makePrices(),
      makeAssumptions({
        ownershipYears: 1,
        insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc_ac' },
      }),
      'insurance',
      {},
    );
    expect(slugs(ocAc)).toEqual(['strong-cheap', 'weak-dear']);
    expect(ocAc[0].value).toBeCloseTo(2261.25 / 12, 6);
    expect(ocAc[1].value).toBeCloseTo(5548.1 / 12, 6);
  });
});
