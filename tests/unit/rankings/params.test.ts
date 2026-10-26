import { describe, expect, it } from 'vitest';
import { resolveTarget } from '@/components/features/link-target';
import {
  clearFilterParams,
  countActiveFilters,
  FILTER_PARAMS,
  parseRankingParams,
} from '@/components/features/rankings/params';

// Query parameters of the rankings page: the order ("dir") and clearing the filters.

const ASSUMPTIONS = 'km=20000&years=3&age=25-34&cov=oc&period=year';
const ALL_FILTERS =
  'make=Kia&make=Dacia&segment=B,C&body=suv&fuel=petrol&fuel=ev&gear=manual&pmin=50000&pmax=200000&q=sport';

/** Name=value pairs of a query, sorted, so that the order of parameters does not matter. */
function pairs(query: string | URLSearchParams): string[] {
  const params = typeof query === 'string' ? new URLSearchParams(query) : query;
  return [...params.entries()].map(([name, value]) => `${name}=${value}`).sort();
}

describe('parseRankingParams - order', () => {
  it('reads "desc" as highest first', () => {
    expect(parseRankingParams(new URLSearchParams('dir=desc')).direction).toBe('desc');
    expect(parseRankingParams({ dir: 'desc', metric: 'price' }).direction).toBe('desc');
  });

  it('reads "asc" and a missing parameter as the default, lowest first', () => {
    expect(parseRankingParams(new URLSearchParams('dir=asc')).direction).toBe('asc');
    expect(parseRankingParams(new URLSearchParams('')).direction).toBe('asc');
    expect(parseRankingParams({}).direction).toBe('asc');
  });

  it.each(['DESC', 'Desc', 'descending', 'xyz', '', ' desc', 'desc ', '1', 'desc,asc'])(
    'reads the invalid value "%s" as the default',
    (value) => {
      expect(parseRankingParams(new URLSearchParams({ dir: value })).direction).toBe('asc');
    },
  );

  it('the order does not change the other parameters', () => {
    const asc = parseRankingParams(new URLSearchParams(`metric=price&${ALL_FILTERS}&limit=20`));
    const desc = parseRankingParams(new URLSearchParams(`metric=price&${ALL_FILTERS}&limit=20&dir=desc`));
    expect({ ...desc, direction: 'asc' }).toEqual(asc);
  });
});

describe('clearFilterParams', () => {
  it('lists exactly the eight filter parameters', () => {
    expect([...FILTER_PARAMS].sort()).toEqual(
      ['body', 'fuel', 'gear', 'make', 'pmax', 'pmin', 'q', 'segment'].sort(),
    );
  });

  it('removes every filter, repeated values included, and the page size', () => {
    const params = new URLSearchParams(`${ALL_FILTERS}&limit=30`);
    clearFilterParams(params);
    expect(pairs(params)).toEqual([]);
  });

  it('keeps the metric, the order, the period and every assumption parameter', () => {
    const params = new URLSearchParams(`metric=insurance&dir=desc&${ASSUMPTIONS}&ins=1800&${ALL_FILTERS}&limit=20`);
    clearFilterParams(params);
    expect(pairs(params)).toEqual(pairs(`metric=insurance&dir=desc&${ASSUMPTIONS}&ins=1800`));
  });

  it('leaves a query without filters as it is', () => {
    const params = new URLSearchParams(`metric=price&dir=desc&${ASSUMPTIONS}`);
    clearFilterParams(params);
    expect(pairs(params)).toEqual(pairs(`metric=price&dir=desc&${ASSUMPTIONS}`));
  });

  it('after clearing no filter counts as active', () => {
    const params = new URLSearchParams(`dir=desc&${ALL_FILTERS}`);
    expect(countActiveFilters(parseRankingParams(params))).toBeGreaterThan(0);
    clearFilterParams(params);
    expect(countActiveFilters(parseRankingParams(params))).toBe(0);
  });
});

describe('countActiveFilters - when "clear filters" has something to clear', () => {
  it('is 0 without filters, whatever the metric, order, period and assumptions', () => {
    expect(countActiveFilters(parseRankingParams(new URLSearchParams(`metric=price&dir=desc&${ASSUMPTIONS}&limit=20`)))).toBe(0);
  });

  it.each([
    ['make', 'make=Kia'],
    ['segment', 'segment=B'],
    ['body', 'body=suv'],
    ['fuel', 'fuel=ev'],
    ['gear', 'gear=automatic'],
    ['pmin', 'pmin=50000'],
    ['pmax', 'pmax=90000'],
    ['q', 'q=clio'],
  ])('counts the filter %s', (_name, query) => {
    expect(countActiveFilters(parseRankingParams(new URLSearchParams(query)))).toBe(1);
  });

  it('does not count values the page ignores', () => {
    const params = new URLSearchParams('segment=Z&body=boat&fuel=steam&gear=both&pmin=abc&pmax=-5&q=%20%20');
    expect(countActiveFilters(parseRankingParams(params))).toBe(0);
    // A make that is not in the catalogue is ignored when the catalogue makes are given.
    expect(countActiveFilters(parseRankingParams(new URLSearchParams('make=NoSuchMake'), ['Kia', 'Dacia']))).toBe(0);
  });
});

describe('resolveTarget - links of the rankings page keep the order', () => {
  const query = `metric=price&dir=desc&${ASSUMPTIONS}&fuel=ev&body=suv&limit=20`;

  it('"clear" drops the filters and the page size and keeps metric, order and assumptions', () => {
    const href = resolveTarget({ kind: 'clear' }, query);
    const [path, search] = href.split('?');
    expect(path).toBe('/rankings');
    expect(pairs(search)).toEqual(pairs(`metric=price&dir=desc&${ASSUMPTIONS}`));
  });

  it('"metric" keeps the order and the filters and starts from the first page', () => {
    const href = resolveTarget({ kind: 'metric', metric: 'insurance' }, query);
    const [path, search] = href.split('?');
    expect(path).toBe('/rankings');
    expect(pairs(search)).toEqual(pairs(`metric=insurance&dir=desc&${ASSUMPTIONS}&fuel=ev&body=suv`));
  });

  it('"more" keeps the order and adds ten rows', () => {
    const href = resolveTarget({ kind: 'more' }, query);
    const [, search] = href.split('?');
    expect(pairs(search)).toEqual(pairs(`metric=price&dir=desc&${ASSUMPTIONS}&fuel=ev&body=suv&limit=30`));
  });

  it('an ascending query gives links without "dir"', () => {
    const ascending = `metric=price&${ASSUMPTIONS}&fuel=ev`;
    for (const target of [{ kind: 'clear' }, { kind: 'more' }, { kind: 'metric', metric: 'parts' }] as const) {
      expect(new URLSearchParams(resolveTarget(target, ascending).split('?')[1]).has('dir')).toBe(false);
    }
  });
});
