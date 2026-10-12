/*
 * The URL query parameters that carry the user's assumptions. Pure helpers,
 * safe to import from Server Components (the hooks live in assumptions-client.ts).
 */
export const ASSUMPTION_PARAM_KEYS = ['km', 'years', 'age', 'cov', 'ins', 'period'] as const;

export type RawParams = Record<string, string | string[] | undefined>;

/** Server `searchParams` as URLSearchParams; repeated parameters stay repeated. */
export function toSearchParams(raw: RawParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(raw)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) params.append(name, item);
    }
  }
  return params;
}

/** Client URLSearchParams as the plain object that `parseAssumptions` reads (first value wins). */
export function toRecord(params: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  params.forEach((value, name) => {
    if (!(name in record)) record[name] = value;
  });
  return record;
}

export function hasAssumptionParams(params: URLSearchParams): boolean {
  return ASSUMPTION_PARAM_KEYS.some((key) => params.has(key));
}

/** Only the assumption parameters of `params`. */
export function pickAssumptionParams(params: URLSearchParams): URLSearchParams {
  const picked = new URLSearchParams();
  for (const key of ASSUMPTION_PARAM_KEYS) {
    const value = params.get(key);
    if (value !== null) picked.set(key, value);
  }
  return picked;
}

/** `path` with the given parameters appended, keeping any query it already has. */
export function withQuery(path: string, ...sources: URLSearchParams[]): string {
  const [base, existing = ''] = path.split('?');
  const params = new URLSearchParams(existing);
  for (const source of sources) source.forEach((value, name) => params.append(name, value));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
