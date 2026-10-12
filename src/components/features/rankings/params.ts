import type { RankingFilters, RankingMetric } from "@/lib/costs";
import type { BodyType, FuelType, Segment, Transmission } from "@/lib/domain/types";
import { toSearchParams, type RawParams } from "@/lib/state/assumption-params";

/*
 * The query parameters of the rankings page: metric, filters, text, page size.
 * Pure functions, used by the server (to rank) and by the browser (to show the
 * state of the filters). Unknown or invalid values are ignored.
 */
export const RANKING_METRICS: readonly RankingMetric[] = [
  "price",
  "totalCost",
  "depreciation",
  "maintenance",
  "service",
  "parts",
  "fuelConsumption",
  "fuelCost",
  "insurance",
];
export const DEFAULT_METRIC: RankingMetric = "totalCost";

export const BODY_TYPES: readonly BodyType[] = [
  "sedan_hatchback",
  "estate",
  "suv",
  "coupe",
  "convertible",
  "mpv",
  "van",
];
export const FUEL_TYPES: readonly FuelType[] = ["petrol", "diesel", "lpg", "hybrid", "phev", "ev"];
export const SEGMENTS: readonly Segment[] = ["A", "B", "C", "D", "E", "F"];
export const TRANSMISSIONS: readonly Transmission[] = ["manual", "automatic"];

export const PAGE_SIZE = 10;
const MAX_LIMIT = 1000;
const MAX_QUERY_LENGTH = 100;
const MAX_PRICE = 10_000_000;

/** Filter parameters; each takes a list as repeated or comma-separated values. */
export const FILTER_PARAMS = ["make", "segment", "body", "fuel", "gear", "pmin", "pmax", "q"] as const;

export interface RankingSelection {
  makes: string[];
  segments: Segment[];
  bodyTypes: BodyType[];
  fuelTypes: FuelType[];
  transmission: Transmission | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
  query: string;
}

export interface RankingParams extends RankingSelection {
  metric: RankingMetric;
  /** Number of results to show, a multiple of PAGE_SIZE. */
  limit: number;
}

/** All values of a parameter that may repeat or hold a comma-separated list. */
export function listValues(params: URLSearchParams, name: string): string[] {
  return params
    .getAll(name)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Replaces a list parameter by the given values, written as repeated parameters. */
export function setListValues(params: URLSearchParams, name: string, values: readonly string[]): void {
  params.delete(name);
  for (const value of values) params.append(name, value);
}

function oneOf<T extends string>(options: readonly T[], values: string[]): T[] {
  const found = values.filter((value): value is T => (options as readonly string[]).includes(value));
  return [...new Set(found)];
}

function parseWhole(raw: string | null, max: number): number | undefined {
  if (raw === null || !/^\d{1,9}$/.test(raw.trim())) return undefined;
  const value = Number(raw.trim());
  return value <= max ? value : undefined;
}

/**
 * Reads the rankings parameters. When `makes` (the display names in the
 * catalogue) is given, only those makes are kept, spelled as in the catalogue.
 */
export function parseRankingParams(
  source: URLSearchParams | RawParams,
  makes?: readonly string[],
): RankingParams {
  const params = source instanceof URLSearchParams ? source : toSearchParams(source);

  const metric = params.get("metric");
  const gear = params.get("gear");
  const requestedMakes = listValues(params, "make");
  const knownMakes = new Map(makes?.map((make) => [make.toLowerCase(), make]));
  const limit = parseWhole(params.get("limit"), MAX_LIMIT);

  return {
    metric: RANKING_METRICS.find((item) => item === metric) ?? DEFAULT_METRIC,
    makes: makes
      ? [...new Set(requestedMakes.flatMap((make) => knownMakes.get(make.toLowerCase()) ?? []))]
      : requestedMakes,
    segments: oneOf(SEGMENTS, listValues(params, "segment").map((value) => value.toUpperCase())),
    bodyTypes: oneOf(BODY_TYPES, listValues(params, "body")),
    fuelTypes: oneOf(FUEL_TYPES, listValues(params, "fuel")),
    transmission: TRANSMISSIONS.find((item) => item === gear),
    priceMin: parseWhole(params.get("pmin"), MAX_PRICE),
    priceMax: parseWhole(params.get("pmax"), MAX_PRICE),
    query: (params.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    limit: limit ? Math.ceil(limit / PAGE_SIZE) * PAGE_SIZE : PAGE_SIZE,
  };
}

export function toFilters(selection: RankingSelection): RankingFilters {
  return {
    makes: selection.makes,
    segments: selection.segments,
    bodyTypes: selection.bodyTypes,
    fuelTypes: selection.fuelTypes,
    transmission: selection.transmission,
    priceMin: selection.priceMin,
    priceMax: selection.priceMax,
    query: selection.query,
  };
}

/** Number of filters that are on; a text counts as one, a price range as one per bound. */
export function countActiveFilters(selection: RankingSelection): number {
  return (
    selection.makes.length +
    selection.segments.length +
    selection.bodyTypes.length +
    selection.fuelTypes.length +
    (selection.transmission ? 1 : 0) +
    (selection.priceMin !== undefined ? 1 : 0) +
    (selection.priceMax !== undefined ? 1 : 0) +
    (selection.query ? 1 : 0)
  );
}

/** `/rankings` with the given parameters. Empty values are left out. */
export function rankingsHref(parts: {
  metric?: RankingMetric;
  limit?: number;
  selection?: Partial<RankingSelection>;
  extra?: URLSearchParams;
}): string {
  const params = new URLSearchParams();
  if (parts.metric && parts.metric !== DEFAULT_METRIC) params.set("metric", parts.metric);

  const selection = parts.selection ?? {};
  setIfAny(params, "make", selection.makes);
  setIfAny(params, "segment", selection.segments);
  setIfAny(params, "body", selection.bodyTypes);
  setIfAny(params, "fuel", selection.fuelTypes);
  if (selection.transmission) params.set("gear", selection.transmission);
  if (selection.priceMin !== undefined) params.set("pmin", String(selection.priceMin));
  if (selection.priceMax !== undefined) params.set("pmax", String(selection.priceMax));
  if (selection.query) params.set("q", selection.query);

  if (parts.limit && parts.limit > PAGE_SIZE) params.set("limit", String(parts.limit));
  parts.extra?.forEach((value, name) => params.set(name, value));

  const query = params.toString();
  return query ? `/rankings?${query}` : "/rankings";
}

function setIfAny(params: URLSearchParams, name: string, values: readonly string[] | undefined) {
  if (values && values.length > 0) setListValues(params, name, values);
}
