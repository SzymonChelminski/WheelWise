"use client";

import { LinkList } from "@/components/ui/MetricSelector";
import type { RankingMetric } from "@/lib/costs";
import { useIntendedQuery } from "@/lib/state/intended-query";
import { resolveTarget } from "../link-target";

/** The links to all rankings; they keep the assumption parameters of the intended query. */
export function RankingLinks({
  items,
  label,
  className,
}: {
  items: { metric: RankingMetric; title: string; description: string }[];
  label: string;
  className?: string;
}) {
  const intended = useIntendedQuery();
  return (
    <LinkList
      label={label}
      className={className}
      items={items.map(({ metric, title, description }) => ({
        href: resolveTarget({ kind: "carry", path: "/rankings", metric }, intended),
        title,
        description,
      }))}
    />
  );
}
