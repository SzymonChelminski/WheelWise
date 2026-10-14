"use client";

import { useId } from "react";
import { MetricSelector } from "@/components/ui/MetricSelector";
import type { RankingMetric } from "@/lib/costs";
import { useIntendedQuery, useQueryWriter } from "@/lib/state/intended-query";
import { resolveTarget } from "../link-target";
import { DEFAULT_METRIC, parseRankingParams, RANKING_METRICS } from "./params";

/**
 * The metric selector: links from 768 px, and a select below that. Both show the metric of the
 * intended query; the links keep the filters and assumptions of it, the select changes the metric like a filter.
 */
export function MetricSelectorControl({
  metrics,
  label,
  className,
}: {
  metrics: { key: RankingMetric; label: string }[];
  label: string;
  className?: string;
}) {
  const id = useId();
  const intended = useIntendedQuery();
  const write = useQueryWriter();
  const { metric: current } = parseRankingParams(new URLSearchParams(intended));

  return (
    <MetricSelector
      metrics={metrics.map(({ key, label: text }) => ({
        key,
        label: text,
        href: resolveTarget({ kind: "metric", metric: key }, intended),
      }))}
      current={current}
      labels={{ label }}
      id={id}
      className={className}
      onSelectChange={(key) => {
        const metric = RANKING_METRICS.find((item) => item === key);
        if (!metric) return;
        write((params) => {
          if (metric === DEFAULT_METRIC) params.delete("metric");
          else params.set("metric", metric);
          params.delete("limit");
        });
      }}
    />
  );
}
