import { mockCompareThree } from "@/mocks/cars";
import { CompareScreen } from "../_components/CompareScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Comparison of 3 cars (the widest case; the third car has a very long name). */
export default async function ComparePreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return <CompareScreen locale={locale} path={`${P}/compare`} slugs={mockCompareThree} />;
}
