"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SearchIndexEntry } from "@/lib/data/search-index";

const SearchIndexContext = createContext<readonly SearchIndexEntry[]>([]);

/** Hands the search index to the search field and the comparison bar without sending it twice. */
export function SearchIndexProvider({
  index,
  children,
}: {
  index: SearchIndexEntry[];
  children: ReactNode;
}) {
  return <SearchIndexContext value={index}>{children}</SearchIndexContext>;
}

export function useSearchIndex(): readonly SearchIndexEntry[] {
  return useContext(SearchIndexContext);
}
