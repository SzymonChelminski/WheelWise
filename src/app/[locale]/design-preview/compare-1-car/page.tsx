import { mockCompareTwo } from "@/mocks/cars";
import { CompareScreen } from "../_components/CompareScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Comparison: 1 car, empty state. */
export default async function CompareOneCarPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <CompareScreen locale={locale} path={`${P}/compare-1-car`} slugs={mockCompareTwo.slice(0, 1)} />
  );
}
