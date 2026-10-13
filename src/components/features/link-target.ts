import type { RankingMetric } from "@/lib/costs";
import {
  ASSUMPTION_PARAM_KEYS,
  pickAssumptionParams,
  withQuery,
} from "@/lib/state/assumption-params";
import {
  DEFAULT_METRIC,
  FILTER_PARAMS,
  PAGE_SIZE,
  parseRankingParams,
} from "./rankings/params";

/*
 * Where a link that carries query state points, as a pure function of the intended
 * query (src/lib/state/intended-query.ts). The description is plain data so a Server
 * Component can hand it to the client component that renders the link.
 */
export type LinkTarget =
  /** `path` with the assumption parameters; `metric` makes it a ranking of that metric. */
  | { kind: "carry"; path: string; metric?: RankingMetric }
  /** The rankings with the same filters and assumptions, another metric, from the first page. */
  | { kind: "metric"; metric: RankingMetric }
  /** The rankings as they are with ten more rows. */
  | { kind: "more" }
  /** The rankings without filters, same metric and assumptions. */
  | { kind: "clear" };

const RANKINGS = "/rankings";
const KEPT_ON_RANKINGS = ["metric", "limit", ...FILTER_PARAMS, ...ASSUMPTION_PARAM_KEYS];

/** The parameters of the rankings page that `query` holds, repeats included. */
function rankingParams(query: string): URLSearchParams {
  const source = new URLSearchParams(query);
  const kept = new URLSearchParams();
  for (const key of KEPT_ON_RANKINGS) {
    for (const value of source.getAll(key)) kept.append(key, value);
  }
  return kept;
}

function setMetric(params: URLSearchParams, metric: RankingMetric): void {
  if (metric === DEFAULT_METRIC) params.delete("metric");
  else params.set("metric", metric);
}

export function resolveTarget(target: LinkTarget, query: string): string {
  switch (target.kind) {
    case "carry": {
      const params = pickAssumptionParams(new URLSearchParams(query));
      if (target.metric) setMetric(params, target.metric);
      return withQuery(target.path, params);
    }
    case "metric": {
      const params = rankingParams(query);
      params.delete("limit");
      setMetric(params, target.metric);
      return withQuery(RANKINGS, params);
    }
    case "more": {
      const params = rankingParams(query);
      const { limit } = parseRankingParams(params);
      params.set("limit", String(limit + PAGE_SIZE));
      return withQuery(RANKINGS, params);
    }
    case "clear": {
      const params = rankingParams(query);
      for (const key of [...FILTER_PARAMS, "limit"]) params.delete(key);
      return withQuery(RANKINGS, params);
    }
  }
}
