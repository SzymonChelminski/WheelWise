import { mockCompareTwo } from "@/mocks/cars";
import { CompareScreen } from "../_components/CompareScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Comparison: 2 cars. */
export default async function CompareTwoCarsPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <CompareScreen locale={locale} path={`${P}/compare-2-cars`} slugs={mockCompareTwo} />
  );
}
