import { mockCompareLongNames } from "@/mocks/cars";
import { CompareScreen } from "../_components/CompareScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Comparison of 3 cars that all carry the 103-character name. */
export default async function CompareLongNamesPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <CompareScreen locale={locale} path={`${P}/compare-long-names`} slugs={mockCompareLongNames} />
  );
}
