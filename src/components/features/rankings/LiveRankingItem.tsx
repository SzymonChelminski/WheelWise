"use client";

import { RankingItem, type RankingItemProps } from "@/components/ui/RankingItem";
import { useIntendedQuery } from "@/lib/state/intended-query";
import { resolveTarget } from "../link-target";

/** A ranking row whose link to the car keeps the assumption parameters of the intended query. */
export function LiveRankingItem({ slug, ...rest }: Omit<RankingItemProps, "href"> & { slug: string }) {
  const intended = useIntendedQuery();
  return <RankingItem {...rest} href={resolveTarget({ kind: "carry", path: `/cars/${slug}` }, intended)} />;
}
