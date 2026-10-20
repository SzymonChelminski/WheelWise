import { mockCar, mockCompareTwo } from "@/mocks/cars";
import { CarScreen } from "../_components/CarScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Car details: the same petrol car with no photo of its model (the photo slot is not rendered). */
export default async function CarNoPhotoPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <CarScreen
      locale={locale}
      path={`${P}/car-no-photo`}
      car={mockCar}
      photo={null}
      compareSlugs={mockCompareTwo}
    />
  );
}
