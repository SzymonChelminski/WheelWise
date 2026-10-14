import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CarContent, CarFrame } from "@/components/features/car/CarDetails";
import { carName } from "@/components/features/car/car-view";
import { CAR_SLUG_PATTERN, MAX_CAR_SLUG_LENGTH } from "@/config/car-lookup";
import { getCar, getCatalog } from "@/lib/data/catalog";
import { formatPln } from "@/lib/format";
import { routing } from "@/i18n/routing";

async function findCar(slug: string) {
  // Anything but a catalogue-shaped slug cannot be a car, so it never reaches the data cache.
  if (slug.length > MAX_CAR_SLUG_LENGTH || !CAR_SLUG_PATTERN.test(slug)) return null;
  return getCar(slug);
}

export async function generateStaticParams() {
  const { cars } = await getCatalog();
  return cars.map((car) => ({ slug: car.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const car = await findCar(slug);
  if (!car) return {};

  const t = await getTranslations({ locale, namespace: "meta.car" });
  const values = { name: carName(car), price: formatPln(car.listPricePln, locale) };
  const path = `/cars/${car.slug}`;
  return {
    title: t("title", values),
    description: t("description", values),
    alternates: {
      canonical: `/${locale}${path}`,
      languages: Object.fromEntries(routing.locales.map((item) => [item, `/${item}${path}`])),
    },
  };
}

async function CarLoader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const car = await findCar(slug);
  if (!car) notFound();

  // Without the market prices the car is shown, and the cost panel says it cannot be calculated.
  const prices = await getCatalog().then(
    (catalog) => catalog.prices,
    (): null => null,
  );
  return <CarContent car={car} prices={prices} />;
}

// The slug is read behind the boundary of the frame (the proxy has already answered 404 for an
// address that is not a car), so the shell of the page does not wait for it.
export default function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <CarFrame>
      <CarLoader params={params} />
    </CarFrame>
  );
}
