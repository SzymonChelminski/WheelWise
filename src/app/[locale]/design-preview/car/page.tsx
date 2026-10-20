import { mockCar, mockCompareTwo } from "@/mocks/cars";
import { mockPhotoFor } from "@/mocks/photos";
import { CarScreen } from "../_components/CarScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Car details: petrol car with its model photo, in the comparison (plain power label). */
export default async function CarPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return <CarScreen locale={locale} path={`${P}/car`} car={mockCar} photo={mockPhotoFor(mockCar)} compareSlugs={mockCompareTwo} />;
}
