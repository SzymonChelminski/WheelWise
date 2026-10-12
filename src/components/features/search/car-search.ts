import type { SearchIndexEntry } from "@/lib/data/search-index";

/** Case- and diacritics-insensitive, as the text query of the rankings. */
function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Builds the search over the index. A car matches when every word of the query is
 * part of "make model variant", the same rule as the text filter of the rankings.
 * Cars whose name starts with the query come first.
 */
export function createCarSearch(index: readonly SearchIndexEntry[]) {
  const rows = index.map((entry) => ({
    entry,
    haystack: normalizeText(`${entry.make} ${entry.model} ${entry.variant}`),
    name: normalizeText(`${entry.make} ${entry.variant}`),
  }));

  return (query: string, limit: number): SearchIndexEntry[] => {
    const normalized = normalizeText(query).trim();
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const starting: SearchIndexEntry[] = [];
    const others: SearchIndexEntry[] = [];
    for (const row of rows) {
      if (!words.every((word) => row.haystack.includes(word))) continue;
      (row.name.startsWith(normalized) ? starting : others).push(row.entry);
    }
    return [...starting, ...others].slice(0, limit);
  };
}
