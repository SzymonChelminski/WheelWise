import { mockCarLongName, mockCompareFullOthers } from "@/mocks/cars";
import { mockPhotoFor } from "@/mocks/photos";
import { CarScreen } from "../_components/CarScreen";
import { assertDesignPreview, P, toLocale } from "../_lib/view";

/* Car details: hybrid with the 103-character name (combustion engine power); the comparison is full, so the toggle is disabled and says why. */
export default async function CarLongNamePreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  return (
    <CarScreen
      locale={locale}
      path={`${P}/car-long-name`}
      car={mockCarLongName}
      photo={mockPhotoFor(mockCarLongName)}
      compareSlugs={mockCompareFullOthers}
    />
  );
}
