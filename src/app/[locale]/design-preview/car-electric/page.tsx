import { mockCarElectric, mockCompareTwo } from "@/mocks/cars";
import { CarScreen } from "../_components/CarScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Car details: electric car (power according to the source data), not in the comparison. */
export default async function CarElectricPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <CarScreen
      locale={locale}
      path={`${P}/car-electric`}
      car={mockCarElectric}
      compareSlugs={mockCompareTwo}
    />
  );
}
