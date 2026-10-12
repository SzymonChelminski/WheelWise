import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_PERIOD,
  parseAssumptions,
  serializeAssumptions,
} from '@/lib/domain/assumptions';
import { assumptionsSchema } from '@/lib/domain/schemas';
import type { Assumptions, Period } from '@/lib/domain/types';
import { AGE_BANDS } from '../helpers/cars';

// Input handling rule of the cost model.
// Defaults: 15000 km, 5 years, estimate, 35-44, OC + AC, period month.

const DEFAULTS = {
  assumptions: {
    annualMileageKm: 15000,
    ownershipYears: 5,
    insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc_ac' },
  },
  period: 'month',
};

describe('defaults', () => {
  it('DEFAULT_ASSUMPTIONS and DEFAULT_PERIOD have the documented default values', () => {
    expect(DEFAULT_ASSUMPTIONS).toEqual(DEFAULTS.assumptions);
    expect(DEFAULT_PERIOD).toBe('month');
  });

  it('parseAssumptions({}) returns the defaults', () => {
    expect(parseAssumptions({})).toEqual(DEFAULTS);
  });

  it('unset values and unknown parameters give the defaults', () => {
    expect(
      parseAssumptions({
        km: undefined,
        years: undefined,
        age: undefined,
        cov: undefined,
        ins: undefined,
        period: undefined,
        utm_source: 'newsletter',
      }),
    ).toEqual(DEFAULTS);
  });

  it('empty strings give the defaults (an empty ins does not switch to custom)', () => {
    expect(parseAssumptions({ km: '', years: '', age: '', cov: '', ins: '', period: '' })).toEqual(
      DEFAULTS,
    );
  });
});

describe('parseAssumptions - km', () => {
  it.each([
    ['20000', 20000],
    ['1000', 1000],
    ['100000', 100000],
    ['1001', 1001],
    ['99999', 99999],
  ])('km=%s is accepted as %i', (raw, expected) => {
    expect(parseAssumptions({ km: raw }).assumptions.annualMileageKm).toBe(expected);
  });

  it.each([
    ['999', 1000],
    ['500', 1000],
    ['0', 1000],
    ['-5', 1000],
    ['100001', 100000],
    ['250000', 100000],
    ['999999999', 100000],
  ])('km=%s is clamped to %i', (raw, expected) => {
    expect(parseAssumptions({ km: raw }).assumptions.annualMileageKm).toBe(expected);
  });

  it.each(['abc', '12abc', 'NaN', 'Infinity', '-Infinity', '20 000', '12000.5'])(
    'km=%s is invalid and falls back to 15000',
    (raw) => {
      expect(parseAssumptions({ km: raw }).assumptions.annualMileageKm).toBe(15000);
    },
  );

  it('km does not change the other values', () => {
    expect(parseAssumptions({ km: '20000' })).toEqual({
      assumptions: { ...DEFAULTS.assumptions, annualMileageKm: 20000 },
      period: 'month',
    });
  });
});

describe('parseAssumptions - years', () => {
  it.each([
    ['1', 1],
    ['3', 3],
    ['7', 7],
    ['10', 10],
  ])('years=%s is accepted as %i', (raw, expected) => {
    expect(parseAssumptions({ years: raw }).assumptions.ownershipYears).toBe(expected);
  });

  it.each([
    ['0', 1],
    ['-3', 1],
    ['11', 10],
    ['999', 10],
  ])('years=%s is clamped to %i', (raw, expected) => {
    expect(parseAssumptions({ years: raw }).assumptions.ownershipYears).toBe(expected);
  });

  it.each(['abc', 'five', 'NaN', 'Infinity', '2.5'])(
    'years=%s is invalid and falls back to 5',
    (raw) => {
      expect(parseAssumptions({ years: raw }).assumptions.ownershipYears).toBe(5);
    },
  );
});

describe('parseAssumptions - age', () => {
  it.each([...AGE_BANDS])('age=%s is accepted', (band) => {
    expect(parseAssumptions({ age: band }).assumptions.insurance).toEqual({
      mode: 'estimate',
      driverAgeBand: band,
      coverage: 'oc_ac',
    });
  });

  // The padded values would be valid bands other than the default if the parser trimmed them.
  it.each(['teen', '30', '75', '18-25', '18-24 ', ' 18-24', '75+ '])(
    'age=%j is invalid and falls back to 35-44',
    (raw) => {
      expect(parseAssumptions({ age: raw }).assumptions.insurance).toEqual({
        mode: 'estimate',
        driverAgeBand: '35-44',
        coverage: 'oc_ac',
      });
    },
  );
});

describe('parseAssumptions - cov', () => {
  it('cov=oc and cov=oc_ac are accepted', () => {
    expect(parseAssumptions({ cov: 'oc' }).assumptions.insurance).toEqual({
      mode: 'estimate',
      driverAgeBand: '35-44',
      coverage: 'oc',
    });
    expect(parseAssumptions({ cov: 'oc_ac' }).assumptions.insurance).toEqual({
      mode: 'estimate',
      driverAgeBand: '35-44',
      coverage: 'oc_ac',
    });
  });

  it.each(['full', 'ac', 'OC', 'oc-ac', '1'])(
    'cov=%s is invalid and falls back to oc_ac',
    (raw) => {
      expect(parseAssumptions({ cov: raw }).assumptions.insurance).toEqual({
        mode: 'estimate',
        driverAgeBand: '35-44',
        coverage: 'oc_ac',
      });
    },
  );

  it('an invalid cov keeps a valid age, and the reverse', () => {
    expect(parseAssumptions({ age: '18-24', cov: 'full' }).assumptions.insurance).toEqual({
      mode: 'estimate',
      driverAgeBand: '18-24',
      coverage: 'oc_ac',
    });
    expect(parseAssumptions({ age: 'teen', cov: 'oc' }).assumptions.insurance).toEqual({
      mode: 'estimate',
      driverAgeBand: '35-44',
      coverage: 'oc',
    });
  });
});

describe('parseAssumptions - period', () => {
  it('period=year and period=month are accepted', () => {
    expect(parseAssumptions({ period: 'year' }).period).toBe('year');
    expect(parseAssumptions({ period: 'month' }).period).toBe('month');
  });

  it.each(['week', 'YEAR', 'yearly', '12'])(
    'period=%s is invalid and falls back to month',
    (raw) => {
      expect(parseAssumptions({ period: raw }).period).toBe('month');
    },
  );
});

describe('parseAssumptions - ins', () => {
  it.each([
    ['1500', 1500],
    ['0', 0],
    ['100000', 100000],
    ['1234.56', 1234.56],
  ])('ins=%s switches to the custom mode with a premium of %d', (raw, expected) => {
    expect(parseAssumptions({ ins: raw }).assumptions.insurance).toEqual({
      mode: 'custom',
      annualPremiumPln: expected,
    });
  });

  it.each([
    ['-1', 0],
    ['-2500', 0],
    ['100001', 100000],
    ['200000', 100000],
  ])('ins=%s is clamped to %i', (raw, expected) => {
    expect(parseAssumptions({ ins: raw }).assumptions.insurance).toEqual({
      mode: 'custom',
      annualPremiumPln: expected,
    });
  });

  it.each(['abc', '12abc', 'NaN', 'Infinity'])(
    'ins=%s is invalid: the mode stays estimate',
    (raw) => {
      expect(parseAssumptions({ ins: raw }).assumptions.insurance).toEqual({
        mode: 'estimate',
        driverAgeBand: '35-44',
        coverage: 'oc_ac',
      });
    },
  );

  it('an invalid ins keeps the age and cov that were given', () => {
    expect(parseAssumptions({ ins: 'abc', age: '25-34', cov: 'oc' }).assumptions.insurance).toEqual(
      { mode: 'estimate', driverAgeBand: '25-34', coverage: 'oc' },
    );
  });

  it('a valid ins wins over age and cov', () => {
    expect(parseAssumptions({ ins: '900', age: '18-24', cov: 'oc' }).assumptions.insurance).toEqual(
      { mode: 'custom', annualPremiumPln: 900 },
    );
  });
});

describe('parseAssumptions - array values', () => {
  it('array values use the first element (every parameter of the estimate mode)', () => {
    expect(
      parseAssumptions({
        km: ['20000', '30000'],
        years: ['3', '9'],
        age: ['25-34', '18-24'],
        cov: ['oc', 'oc_ac'],
        period: ['year', 'month'],
      }),
    ).toEqual({
      assumptions: {
        annualMileageKm: 20000,
        ownershipYears: 3,
        insurance: { mode: 'estimate', driverAgeBand: '25-34', coverage: 'oc' },
      },
      period: 'year',
    });
  });

  it('array value of ins uses the first element', () => {
    expect(parseAssumptions({ ins: ['900', '1000'] }).assumptions.insurance).toEqual({
      mode: 'custom',
      annualPremiumPln: 900,
    });
  });

  it('an invalid first element falls back to the default, later elements are ignored', () => {
    expect(
      parseAssumptions({
        km: ['abc', '20000'],
        years: ['x', '3'],
        age: ['teen', '18-24'],
        cov: ['full', 'oc'],
        ins: ['abc', '900'],
        period: ['week', 'year'],
      }),
    ).toEqual(DEFAULTS);
  });

  it('an empty array gives the default', () => {
    expect(
      parseAssumptions({ km: [], years: [], age: [], cov: [], ins: [], period: [] }),
    ).toEqual(DEFAULTS);
  });
});

describe('parseAssumptions - combined and hostile input', () => {
  it('all parameters together (estimate mode)', () => {
    expect(
      parseAssumptions({ km: '30000', years: '8', age: '18-24', cov: 'oc', period: 'year' }),
    ).toEqual({
      assumptions: {
        annualMileageKm: 30000,
        ownershipYears: 8,
        insurance: { mode: 'estimate', driverAgeBand: '18-24', coverage: 'oc' },
      },
      period: 'year',
    });
  });

  it('the result always passes assumptionsSchema, whatever the input', () => {
    const hostile = [
      '',
      ' ',
      '0',
      '-1',
      '-0',
      '1e999',
      '-1e999',
      '1e3',
      '0x10',
      '99999999999999999999',
      '1.5',
      'NaN',
      'null',
      'undefined',
      '[object Object]',
      '<script>alert(1)</script>',
      "'; DROP TABLE cars; --",
      '__proto__',
      '٣',
      'x'.repeat(10000),
    ];
    let checked = 0;
    for (const value of hostile) {
      for (const shape of [value, [value], [value, '5']]) {
        const params = { km: shape, years: shape, age: shape, cov: shape, ins: shape, period: shape };
        const { assumptions, period } = parseAssumptions(params);
        const label = JSON.stringify(value).slice(0, 60);
        expect(assumptionsSchema.safeParse(assumptions).success, label).toBe(true);
        expect(['month', 'year'], label).toContain(period);
        checked += 1;
      }
    }
    expect(checked).toBe(60);
  });
});

describe('serializeAssumptions', () => {
  it('the defaults serialize to an empty query string', () => {
    expect(serializeAssumptions(DEFAULTS.assumptions as Assumptions, 'month').toString()).toBe('');
  });

  it.each<[string, Assumptions, Period, string]>([
    [
      'km',
      {
        annualMileageKm: 20000,
        ownershipYears: 5,
        insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc_ac' },
      },
      'month',
      'km=20000',
    ],
    [
      'years',
      {
        annualMileageKm: 15000,
        ownershipYears: 3,
        insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc_ac' },
      },
      'month',
      'years=3',
    ],
    [
      'age',
      {
        annualMileageKm: 15000,
        ownershipYears: 5,
        insurance: { mode: 'estimate', driverAgeBand: '18-24', coverage: 'oc_ac' },
      },
      'month',
      'age=18-24',
    ],
    [
      'cov',
      {
        annualMileageKm: 15000,
        ownershipYears: 5,
        insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc' },
      },
      'month',
      'cov=oc',
    ],
    [
      'period',
      {
        annualMileageKm: 15000,
        ownershipYears: 5,
        insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc_ac' },
      },
      'year',
      'period=year',
    ],
    [
      'ins',
      {
        annualMileageKm: 15000,
        ownershipYears: 5,
        insurance: { mode: 'custom', annualPremiumPln: 1500 },
      },
      'month',
      'ins=1500',
    ],
  ])('only %s is written when it is the only non-default value', (_name, a, period, expected) => {
    expect(serializeAssumptions(a, period).toString()).toBe(expected);
  });

  it('the age band 75+ is written URL-encoded', () => {
    const params = serializeAssumptions(
      {
        annualMileageKm: 15000,
        ownershipYears: 5,
        insurance: { mode: 'estimate', driverAgeBand: '75+', coverage: 'oc_ac' },
      },
      'month',
    );
    expect(params.get('age')).toBe('75+');
    expect(params.toString()).toBe('age=75%2B');
  });

  it('a custom premium of 0 is written, because its presence selects the custom mode', () => {
    const params = serializeAssumptions(
      {
        annualMileageKm: 15000,
        ownershipYears: 5,
        insurance: { mode: 'custom', annualPremiumPln: 0 },
      },
      'month',
    );
    expect(params.toString()).toBe('ins=0');
  });

  it('the custom mode writes neither age nor cov', () => {
    const params = serializeAssumptions(
      {
        annualMileageKm: 30000,
        ownershipYears: 8,
        insurance: { mode: 'custom', annualPremiumPln: 2400 },
      },
      'year',
    );
    expect([...params.keys()].sort()).toEqual(['ins', 'km', 'period', 'years']);
    expect(params.get('km')).toBe('30000');
    expect(params.get('years')).toBe('8');
    expect(params.get('ins')).toBe('2400');
    expect(params.get('period')).toBe('year');
  });

  it('all non-default values of the estimate mode are written', () => {
    const params = serializeAssumptions(
      {
        annualMileageKm: 30000,
        ownershipYears: 8,
        insurance: { mode: 'estimate', driverAgeBand: '18-24', coverage: 'oc' },
      },
      'year',
    );
    expect([...params.keys()].sort()).toEqual(['age', 'cov', 'km', 'period', 'years']);
    expect(params.get('km')).toBe('30000');
    expect(params.get('years')).toBe('8');
    expect(params.get('age')).toBe('18-24');
    expect(params.get('cov')).toBe('oc');
    expect(params.get('period')).toBe('year');
  });
});

describe('round trip', () => {
  const inputs: [Assumptions, Period][] = [
    [DEFAULTS.assumptions as Assumptions, 'month'],
    [DEFAULTS.assumptions as Assumptions, 'year'],
    [
      {
        annualMileageKm: 1000,
        ownershipYears: 1,
        insurance: { mode: 'estimate', driverAgeBand: '18-24', coverage: 'oc' },
      },
      'year',
    ],
    [
      {
        annualMileageKm: 100000,
        ownershipYears: 10,
        insurance: { mode: 'estimate', driverAgeBand: '75+', coverage: 'oc_ac' },
      },
      'month',
    ],
    [
      {
        annualMileageKm: 22500,
        ownershipYears: 7,
        insurance: { mode: 'estimate', driverAgeBand: '35-44', coverage: 'oc' },
      },
      'month',
    ],
    [
      {
        annualMileageKm: 15000,
        ownershipYears: 5,
        insurance: { mode: 'estimate', driverAgeBand: '70-74', coverage: 'oc_ac' },
      },
      'year',
    ],
    [
      {
        annualMileageKm: 15000,
        ownershipYears: 5,
        insurance: { mode: 'custom', annualPremiumPln: 0 },
      },
      'month',
    ],
    [
      {
        annualMileageKm: 40000,
        ownershipYears: 2,
        insurance: { mode: 'custom', annualPremiumPln: 1234.5 },
      },
      'year',
    ],
    [
      {
        annualMileageKm: 12345,
        ownershipYears: 9,
        insurance: { mode: 'custom', annualPremiumPln: 100000 },
      },
      'month',
    ],
  ];

  it.each(inputs)(
    'parseAssumptions(serializeAssumptions(x)) returns x for %j, period %s',
    (assumptions, period) => {
      // Through the query string, as the browser does.
      const query = serializeAssumptions(assumptions, period).toString();
      const params = Object.fromEntries(new URLSearchParams(query));
      expect(parseAssumptions(params)).toEqual({ assumptions, period });
    },
  );

  it.each([...AGE_BANDS])('round trip keeps the age band %s', (driverAgeBand) => {
    const assumptions: Assumptions = {
      annualMileageKm: 18000,
      ownershipYears: 4,
      insurance: { mode: 'estimate', driverAgeBand, coverage: 'oc' },
    };
    const query = serializeAssumptions(assumptions, 'year').toString();
    const params = Object.fromEntries(new URLSearchParams(query));
    expect(parseAssumptions(params)).toEqual({ assumptions, period: 'year' });
  });
});
