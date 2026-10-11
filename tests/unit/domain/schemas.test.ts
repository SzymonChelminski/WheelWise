import { describe, expect, it } from 'vitest';
import {
  assumptionsSchema,
  carCatalogSchema,
  carInputSchema,
  marketPricesSchema,
} from '@/lib/domain/schemas';
import type { FuelType } from '@/lib/domain/types';
import { FUEL_TYPES, makeCarInput, makeCarInputOfFuel, makePrices } from '../helpers/cars';

/** First path segment of every issue reported for the input. Empty when the input is valid. */
function rejectedFields(input: unknown): string[] {
  const result = carInputSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => String(issue.path[0]));
}

describe('carInputSchema - valid input', () => {
  it.each([...FUEL_TYPES])('accepts a valid %s car', (fuelType) => {
    const input = makeCarInputOfFuel(fuelType);
    const result = carInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(input);
  });

  it.each(['a', 'abc', 'a1', '208', 'renault-clio-5', 'bmw-218i-active-tourer'])(
    'accepts the kebab-case slug %s',
    (slug) => {
      expect(rejectedFields(makeCarInput({ slug }))).toEqual([]);
    },
  );

  it.each(['sedan_hatchback', 'estate', 'suv', 'coupe', 'convertible', 'mpv', 'van'] as const)(
    'accepts the body type %s',
    (bodyType) => {
      expect(rejectedFields(makeCarInput({ bodyType }))).toEqual([]);
    },
  );
});

describe('carInputSchema - consumption rules', () => {
  it('rejects an ev with fuelL100', () => {
    expect(rejectedFields(makeCarInputOfFuel('ev', { fuelL100: 5 }))).toEqual(['fuelL100']);
  });

  it('rejects a petrol car with electricKwh100', () => {
    expect(rejectedFields(makeCarInputOfFuel('petrol', { electricKwh100: 15 }))).toEqual([
      'electricKwh100',
    ]);
  });

  it.each(['diesel', 'lpg', 'hybrid'] satisfies FuelType[])(
    'rejects a %s car with electricKwh100',
    (fuelType) => {
      expect(rejectedFields(makeCarInputOfFuel(fuelType, { electricKwh100: 15 }))).toEqual([
        'electricKwh100',
      ]);
    },
  );

  it('rejects a phev without fuelL100', () => {
    expect(rejectedFields(makeCarInputOfFuel('phev', { fuelL100: null }))).toEqual(['fuelL100']);
  });

  it('rejects a phev without electricKwh100', () => {
    expect(rejectedFields(makeCarInputOfFuel('phev', { electricKwh100: null }))).toEqual([
      'electricKwh100',
    ]);
  });

  it('rejects a phev without both values', () => {
    expect(
      rejectedFields(makeCarInputOfFuel('phev', { fuelL100: null, electricKwh100: null })).sort(),
    ).toEqual(['electricKwh100', 'fuelL100']);
  });

  it('rejects an ev without electricKwh100', () => {
    expect(rejectedFields(makeCarInputOfFuel('ev', { electricKwh100: null }))).toEqual([
      'electricKwh100',
    ]);
  });

  it.each(['petrol', 'diesel', 'lpg', 'hybrid'] satisfies FuelType[])(
    'rejects a %s car without fuelL100',
    (fuelType) => {
      expect(rejectedFields(makeCarInputOfFuel(fuelType, { fuelL100: null }))).toEqual([
        'fuelL100',
      ]);
    },
  );
});

describe('carInputSchema - slug', () => {
  it.each([
    ['upper-case letters', 'Sample-Sandero'],
    ['all upper-case', 'SANDERO'],
    ['a space', 'sample sandero'],
    ['an underscore', 'sample_sandero'],
    ['a leading hyphen', '-sandero'],
    ['a trailing hyphen', 'sandero-'],
    ['a double hyphen', 'sample--sandero'],
    ['a non-ASCII letter', 'skoda-ł'],
    ['a letter with a diacritic', 'škoda-octavia'],
    ['a dot', 'golf-1.5'],
    ['a slash', 'vw/golf'],
    ['an empty string', ''],
    ['a trailing newline', 'sandero\n'],
  ])('rejects a non-kebab slug with %s', (_label, slug) => {
    expect(rejectedFields(makeCarInput({ slug }))).toEqual(['slug']);
  });
});

describe('carInputSchema - prices and enums', () => {
  it('rejects a negative listPricePln', () => {
    expect(rejectedFields(makeCarInput({ listPricePln: -100 }))).toEqual(['listPricePln']);
  });

  it('rejects a negative priceEur', () => {
    expect(rejectedFields(makeCarInput({ priceEur: -1 }))).toEqual(['priceEur']);
  });

  it('rejects an unknown body type', () => {
    expect(rejectedFields({ ...makeCarInput(), bodyType: 'pickup' })).toEqual(['bodyType']);
    expect(rejectedFields({ ...makeCarInput(), bodyType: 'SUV' })).toEqual(['bodyType']);
    expect(rejectedFields({ ...makeCarInput(), bodyType: '' })).toEqual(['bodyType']);
  });

  it('rejects an unknown fuel type, segment, transmission, tier and retention', () => {
    expect(rejectedFields({ ...makeCarInput(), fuelType: 'hydrogen' })).toContain('fuelType');
    expect(rejectedFields({ ...makeCarInput(), segment: 'G' })).toEqual(['segment']);
    expect(rejectedFields({ ...makeCarInput(), transmission: 'cvt' })).toEqual(['transmission']);
    expect(rejectedFields({ ...makeCarInput(), brandTier: 'luxury' })).toEqual(['brandTier']);
    expect(rejectedFields({ ...makeCarInput(), valueRetention: 'medium' })).toEqual([
      'valueRetention',
    ]);
  });

  it('rejects a missing required field', () => {
    const { slug: _slug, ...withoutSlug } = makeCarInput();
    void _slug;
    expect(rejectedFields(withoutSlug)).toEqual(['slug']);
  });

  it('rejects input that is not an object', () => {
    expect(carInputSchema.safeParse(null).success).toBe(false);
    expect(carInputSchema.safeParse('renault-clio').success).toBe(false);
    expect(carInputSchema.safeParse([]).success).toBe(false);
  });
});

describe('carCatalogSchema', () => {
  it('accepts a catalogue with unique slugs', () => {
    const catalog = FUEL_TYPES.map((fuelType) => makeCarInputOfFuel(fuelType));
    const result = carCatalogSchema.safeParse(catalog);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(6);
  });

  it('rejects duplicate slugs and points at the duplicate entry', () => {
    const catalog = [
      makeCarInput({ slug: 'car-one' }),
      makeCarInput({ slug: 'car-two' }),
      makeCarInput({ slug: 'car-one', variant: 'Another variant' }),
    ];
    const result = carCatalogSchema.safeParse(catalog);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([[2, 'slug']]);
  });

  it('rejects a catalogue that contains one invalid car', () => {
    const catalog = [makeCarInput({ slug: 'car-one' }), makeCarInput({ slug: 'Car Two' })];
    const result = carCatalogSchema.safeParse(catalog);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([[1, 'slug']]);
  });

  it('rejects input that is not an array', () => {
    expect(carCatalogSchema.safeParse(makeCarInput()).success).toBe(false);
  });
});

describe('marketPricesSchema', () => {
  it('accepts the four cost keys', () => {
    expect(marketPricesSchema.safeParse(makePrices()).success).toBe(true);
  });

  it.each(['petrol', 'diesel', 'lpg', 'electricity'] as const)(
    'rejects prices without the %s key',
    (key) => {
      const prices: Record<string, unknown> = { ...makePrices() };
      delete prices[key];
      const result = marketPricesSchema.safeParse(prices);
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([key]);
    },
  );

  it.each([0, -6.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a petrol price of %d',
    (pricePln) => {
      const prices = makePrices();
      const result = marketPricesSchema.safeParse({
        ...prices,
        petrol: { ...prices.petrol, pricePln },
      });
      expect(result.success).toBe(false);
    },
  );
});

describe('assumptionsSchema', () => {
  const valid = {
    annualMileageKm: 15000,
    ownershipYears: 5,
    insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc_ac' },
  };

  it('accepts the default assumptions and the range limits', () => {
    expect(assumptionsSchema.safeParse(valid).success).toBe(true);
    expect(
      assumptionsSchema.safeParse({ ...valid, annualMileageKm: 1000, ownershipYears: 1 }).success,
    ).toBe(true);
    expect(
      assumptionsSchema.safeParse({ ...valid, annualMileageKm: 100000, ownershipYears: 10 })
        .success,
    ).toBe(true);
    expect(
      assumptionsSchema.safeParse({ ...valid, insurance: { mode: 'custom', annualPremiumPln: 0 } })
        .success,
    ).toBe(true);
    expect(
      assumptionsSchema.safeParse({
        ...valid,
        insurance: { mode: 'custom', annualPremiumPln: 100000 },
      }).success,
    ).toBe(true);
  });

  it.each([
    ['mileage below 1000', { ...valid, annualMileageKm: 999 }],
    ['mileage above 100000', { ...valid, annualMileageKm: 100001 }],
    ['0 years', { ...valid, ownershipYears: 0 }],
    ['11 years', { ...valid, ownershipYears: 11 }],
    ['a non-integer number of years', { ...valid, ownershipYears: 2.5 }],
    ['a negative premium', { ...valid, insurance: { mode: 'custom', annualPremiumPln: -1 } }],
    [
      'a premium above 100000',
      { ...valid, insurance: { mode: 'custom', annualPremiumPln: 100001 } },
    ],
    [
      'an unknown age band',
      { ...valid, insurance: { mode: 'estimate', driverAgeBand: '30', coverage: 'oc' } },
    ],
    [
      'an unknown coverage',
      { ...valid, insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'ac' } },
    ],
    ['an unknown insurance mode', { ...valid, insurance: { mode: 'none' } }],
  ])('rejects %s', (_label, input) => {
    expect(assumptionsSchema.safeParse(input).success).toBe(false);
  });
});
