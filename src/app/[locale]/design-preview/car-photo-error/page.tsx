import { mockCar, mockCompareTwo } from "@/mocks/cars";
import { mockPhotoBroken } from "@/mocks/photos";
import { CarScreen } from "../_components/CarScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/*
 * Car details: the photo data exists but every thumbnail answers 404 (a file
 * deleted on Commons). The photo slot disappears and the page looks like
 * "car-no-photo" (DESIGN.md 6.3, load failure).
 */
export default async function CarPhotoErrorPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <CarScreen
      locale={locale}
      path={`${P}/car-photo-error`}
      car={mockCar}
      photo={mockPhotoBroken}
      compareSlugs={mockCompareTwo}
    />
  );
}
