import { describe, expect, it } from 'vitest';
import { requiredIncome } from '@/lib/costs';

// Required income rule of the cost model. Shares 0.10, 0.15, 0.20; bounds rounded to the nearest 100 PLN.

describe('requiredIncome - reference case', () => {
  it('requiredIncome(1713.40) gives the income ranges of the cost model reference case', () => {
    // 17134 -> 17100; 11422.67 -> 11400; 8567 -> 8600
    expect(requiredIncome(1713.4)).toEqual([
      { level: 'comfortable', minIncomePln: 17100, maxIncomePln: null },
      { level: 'reasonable', minIncomePln: 11400, maxIncomePln: 17100 },
      { level: 'stretch', minIncomePln: 8600, maxIncomePln: 11400 },
      { level: 'not_recommended', minIncomePln: null, maxIncomePln: 8600 },
    ]);
  });
});

describe('requiredIncome - structure', () => {
  it('returns the four levels in the order comfortable, reasonable, stretch, not_recommended', () => {
    expect(requiredIncome(2499).map((range) => range.level)).toEqual([
      'comfortable',
      'reasonable',
      'stretch',
      'not_recommended',
    ]);
  });

  it('the last level is not_recommended with no lower bound', () => {
    const ranges = requiredIncome(2499);
    const last = ranges[ranges.length - 1];
    expect(ranges).toHaveLength(4);
    expect(last.level).toBe('not_recommended');
    expect(last.minIncomePln).toBeNull();
    expect(last.maxIncomePln).toBe(12500);
  });

  it('the first level is comfortable with no upper bound', () => {
    const [first] = requiredIncome(2499);
    expect(first.level).toBe('comfortable');
    expect(first.maxIncomePln).toBeNull();
    expect(first.minIncomePln).toBe(25000);
  });

  it.each([1, 49, 333.33, 1000, 1713.4, 2499, 9876.54, 250000])(
    'ranges are contiguous for a monthly cost of %d (each max equals the previous min)',
    (cost) => {
      const ranges = requiredIncome(cost);
      expect(ranges).toHaveLength(4);
      for (let i = 1; i < ranges.length; i += 1) {
        expect(ranges[i].maxIncomePln).not.toBeNull();
        expect(ranges[i].maxIncomePln).toBe(ranges[i - 1].minIncomePln);
      }
    },
  );
});

describe('requiredIncome - rounding to 100 PLN', () => {
  it('rounds down below the half step and up above it', () => {
    // 2499 / 0.10 = 24990 -> 25000; / 0.15 = 16660 -> 16700; / 0.20 = 12495 -> 12500
    const ranges = requiredIncome(2499);
    expect(ranges[0].minIncomePln).toBe(25000);
    expect(ranges[1].minIncomePln).toBe(16700);
    expect(ranges[2].minIncomePln).toBe(12500);
  });

  it('exact multiples stay unchanged and 6666.67 rounds to 6700', () => {
    // 1000 / 0.10 = 10000; / 0.15 = 6666.67 -> 6700; / 0.20 = 5000
    const ranges = requiredIncome(1000);
    expect(ranges[0].minIncomePln).toBe(10000);
    expect(ranges[1].minIncomePln).toBe(6700);
    expect(ranges[2].minIncomePln).toBe(5000);
  });

  it('values below 50 PLN round to 0 (monthly cost 7.4)', () => {
    // 74 -> 100; 49.33 -> 0; 37 -> 0
    const ranges = requiredIncome(7.4);
    expect(ranges[0].minIncomePln).toBe(100);
    expect(ranges[1].minIncomePln).toBe(0);
    expect(ranges[2].minIncomePln).toBe(0);
  });

  it.each([1, 49, 333.33, 1713.4, 9876.54, 123456.78])(
    'every bound for a monthly cost of %d is a multiple of 100',
    (cost) => {
      for (const range of requiredIncome(cost)) {
        for (const bound of [range.minIncomePln, range.maxIncomePln]) {
          if (bound !== null) expect(bound % 100).toBe(0);
        }
      }
    },
  );

  it('the bounds are ordered: comfortable >= reasonable >= stretch', () => {
    const ranges = requiredIncome(1713.4);
    expect(ranges[0].minIncomePln as number).toBeGreaterThan(ranges[1].minIncomePln as number);
    expect(ranges[1].minIncomePln as number).toBeGreaterThan(ranges[2].minIncomePln as number);
  });
});

describe('requiredIncome - degenerate input', () => {
  const zeroStructure = [
    { level: 'comfortable', minIncomePln: 0, maxIncomePln: null },
    { level: 'reasonable', minIncomePln: 0, maxIncomePln: 0 },
    { level: 'stretch', minIncomePln: 0, maxIncomePln: 0 },
    { level: 'not_recommended', minIncomePln: null, maxIncomePln: 0 },
  ];

  it.each([
    ['zero', 0],
    ['negative zero', -0],
    ['a negative cost', -1713.4],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
  ])('%s does not throw and gives 0 for every non-null bound', (_label, cost) => {
    let ranges: ReturnType<typeof requiredIncome> = [];
    expect(() => {
      ranges = requiredIncome(cost);
    }).not.toThrow();
    // `+ 0` turns a possible -0 into 0 so that the comparison is on the numeric value.
    const normalized = ranges.map((range) => ({
      level: range.level,
      minIncomePln: range.minIncomePln === null ? null : range.minIncomePln + 0,
      maxIncomePln: range.maxIncomePln === null ? null : range.maxIncomePln + 0,
    }));
    expect(normalized).toEqual(zeroStructure);
  });
});
