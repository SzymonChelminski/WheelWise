import { CompareScreen } from "../_components/CompareScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Comparison: no cars, empty state. */
export default async function CompareEmptyPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <CompareScreen locale={locale} path={`${P}/compare-empty`} slugs={[]} />
  );
}
