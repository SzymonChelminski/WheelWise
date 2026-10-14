import { getTranslations } from "next-intl/server";
import { h1Class } from "@/components/ui/styles";
import { getCatalog } from "@/lib/data/catalog";
import type { RawParams } from "@/lib/state/assumption-params";
import { LoadError } from "../ListError";
import { CompareView } from "./CompareView";
import { COMPARE_PARAM, compareCandidates, pickCompared } from "./compare-slugs";

/**
 * Reads the cars named in the address and hands them, with the market prices, to the browser.
 * When the catalogue cannot be read the page keeps its h1 and shows an error with a retry; the
 * selection in the address and in the comparison bar is not touched.
 */
export async function CompareContent({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = (await searchParams)[COMPARE_PARAM];
  const catalog = await getCatalog().catch((): null => null);

  if (!catalog) {
    const t = await getTranslations("compare");
    return (
      <>
        <h1 tabIndex={-1} className={h1Class}>
          {t("title")}
        </h1>
        <LoadError title={t("errorTitle")} className="mt-6 max-w-2xl">
          <p>{t("errorText")}</p>
        </LoadError>
      </>
    );
  }

  const { cars, prices } = catalog;
  const bySlug = new Map(cars.map((car) => [car.slug, car]));
  const slugs = pickCompared(compareCandidates(Array.isArray(raw) ? raw[0] : raw), (slug) =>
    bySlug.has(slug),
  );
  return <CompareView cars={slugs.flatMap((slug) => bySlug.get(slug) ?? [])} prices={prices} />;
}
