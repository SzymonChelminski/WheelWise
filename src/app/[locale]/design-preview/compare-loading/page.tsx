import { mockCompareThree } from "@/mocks/cars";
import { CompareScreen } from "../_components/CompareScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Comparison: loading skeleton. */
export default async function CompareLoadingPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <CompareScreen locale={locale} path={`${P}/compare-loading`} slugs={mockCompareThree} loading />
  );
}
