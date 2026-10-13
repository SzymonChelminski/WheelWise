import { getCatalog } from "@/lib/data/catalog";
import type { RawParams } from "@/lib/state/assumption-params";
import { CompareView } from "./CompareView";
import { COMPARE_PARAM, compareCandidates, pickCompared } from "./compare-slugs";

/** Reads the cars named in the address and hands them, with the market prices, to the browser. */
export async function CompareContent({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = (await searchParams)[COMPARE_PARAM];
  const { cars, prices } = await getCatalog();

  const bySlug = new Map(cars.map((car) => [car.slug, car]));
  const slugs = pickCompared(compareCandidates(Array.isArray(raw) ? raw[0] : raw), (slug) =>
    bySlug.has(slug),
  );
  return <CompareView cars={slugs.flatMap((slug) => bySlug.get(slug) ?? [])} prices={prices} />;
}
