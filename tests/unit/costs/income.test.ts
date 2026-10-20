import { describe, expect, it } from 'vitest';
import { requiredIncome } from '@/lib/costs';

// Required income rule of the cost model. Shares 0.15, 0.20, 0.25 (Polish guidance); bounds rounded to the
// nearest 100 PLN.

describe('requiredIncome - reference case', () => {
  it('requiredIncome(1713.40) gives the income ranges of the cost model reference case', () => {
    // 1713.40 / 0.15 = 11422.67 -> 11400; / 0.20 = 8567 -> 8600; / 0.25 = 6853.6 -> 6900
    expect(requiredIncome(1713.4)).toEqual([
      { level: 'comfortable', minIncomePln: 11400, maxIncomePln: null },
      { level: 'reasonable', minIncomePln: 8600, maxIncomePln: 11400 },
      { level: 'stretch', minIncomePln: 6900, maxIncomePln: 8600 },
      { level: 'not_recommended', minIncomePln: null, maxIncomePln: 6900 },
    ]);
  });

  it('a monthly cost of 2000 PLN needs 13 300 PLN for comfortable, 10 000 for reasonable and 8000 for stretch', () => {
    // 2000 / 0.15 = 13333.33 -> 13300; / 0.20 = 10000; / 0.25 = 8000
    expect(requiredIncome(2000)).toEqual([
      { level: 'comfortable', minIncomePln: 13300, maxIncomePln: null },
      { level: 'reasonable', minIncomePln: 10000, maxIncomePln: 13300 },
      { level: 'stretch', minIncomePln: 8000, maxIncomePln: 10000 },
      { level: 'not_recommended', minIncomePln: null, maxIncomePln: 8000 },
    ]);
  });

  it('the shares are 15 %, 20 % and 25 %: a cost of 3000 PLN gives exactly 20 000, 15 000 and 12 000 PLN', () => {
    // Values that need no rounding, so each bound is exactly cost / share.
    const [comfortable, reasonable, stretch] = requiredIncome(3000);
    expect(comfortable.minIncomePln).toBe(20000);
    expect(reasonable.minIncomePln).toBe(15000);
    expect(stretch.minIncomePln).toBe(12000);
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
    expect(last.maxIncomePln).toBe(10000);
  });

  it('the first level is comfortable with no upper bound', () => {
    const [first] = requiredIncome(2499);
    expect(first.level).toBe('comfortable');
    expect(first.maxIncomePln).toBeNull();
    expect(first.minIncomePln).toBe(16700);
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
    // 1713.40 / 0.15 = 11422.67 -> 11400 (down); / 0.20 = 8567 -> 8600 (up); / 0.25 = 6853.6 -> 6900 (up)
    const ranges = requiredIncome(1713.4);
    expect(ranges[0].minIncomePln).toBe(11400);
    expect(ranges[1].minIncomePln).toBe(8600);
    expect(ranges[2].minIncomePln).toBe(6900);
    // 2499 / 0.15 = 16660 -> 16700; / 0.20 = 12495 -> 12500; / 0.25 = 9996 -> 10000
    const higher = requiredIncome(2499);
    expect(higher[0].minIncomePln).toBe(16700);
    expect(higher[1].minIncomePln).toBe(12500);
    expect(higher[2].minIncomePln).toBe(10000);
  });

  it('exact multiples stay unchanged and 6666.67 rounds to 6700', () => {
    // 1000 / 0.15 = 6666.67 -> 6700; / 0.20 = 5000; / 0.25 = 4000
    const ranges = requiredIncome(1000);
    expect(ranges[0].minIncomePln).toBe(6700);
    expect(ranges[1].minIncomePln).toBe(5000);
    expect(ranges[2].minIncomePln).toBe(4000);
  });

  it('values below 50 PLN round to 0 (monthly cost 8)', () => {
    // 8 / 0.15 = 53.33 -> 100; / 0.20 = 40 -> 0; / 0.25 = 32 -> 0
    const ranges = requiredIncome(8);
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
