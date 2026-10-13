/*
 * The cars named in the `cars` query parameter of the comparison page: comma-separated
 * slugs, each once, in the order given. Whether a slug is a car of the catalogue is decided
 * by the caller, because only then can the first three valid ones be picked.
 */
export const COMPARE_PARAM = "cars";

// The size of a comparison; the same limit as COMPARE_LIMIT of the browser-only selection store,
// repeated here because this file is also read on the server.
export const MAX_COMPARED = 3;

// More than anyone can compare; keeps a long address from becoming a long catalogue lookup.
const MAX_CANDIDATES = 20;

export function compareCandidates(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const slugs = raw
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  return [...new Set(slugs)].slice(0, MAX_CANDIDATES);
}

/** The first cars of `candidates` that `isKnown` accepts, at most as many as a comparison holds. */
export function pickCompared(candidates: readonly string[], isKnown: (slug: string) => boolean): string[] {
  return candidates.filter(isKnown).slice(0, MAX_COMPARED);
}
