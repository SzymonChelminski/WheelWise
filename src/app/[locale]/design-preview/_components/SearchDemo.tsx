"use client";

import { useState } from "react";
import {
  SearchCombobox,
  type SearchComboboxLabels,
  type SearchOption,
} from "@/components/ui/SearchCombobox";

/*
 * Preview wiring for the search combobox: filters the mock options by the
 * typed text so that the states can be tried by hand. Not production code;
 * the real search belongs to src/components/features.
 */
export function SearchDemo({
  labels,
  options,
  statusTexts,
  size,
  defaultQuery = "",
  defaultOpen,
  demoActiveIndex,
  demo,
  className,
}: {
  labels: SearchComboboxLabels;
  options: SearchOption[];
  /** Status text by result count, index 0..options.length. */
  statusTexts: string[];
  size?: "md" | "lg";
  defaultQuery?: string;
  defaultOpen?: boolean;
  demoActiveIndex?: number;
  demo?: "focus";
  className?: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const needle = query.trim().toLowerCase();
  const results = needle
    ? options.filter((option) => option.title.toLowerCase().includes(needle))
    : [];
  return (
    <SearchCombobox
      labels={labels}
      options={results}
      query={query}
      onQueryChange={setQuery}
      statusText={statusTexts[results.length]}
      size={size}
      defaultOpen={defaultOpen}
      demoActiveIndex={demoActiveIndex}
      demo={demo}
      className={className}
    />
  );
}
