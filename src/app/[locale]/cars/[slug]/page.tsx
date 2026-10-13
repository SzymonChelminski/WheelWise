import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CarDetails } from "@/components/features/car/CarDetails";
import { carName } from "@/components/features/car/car-view";
import { getCar, getCatalog } from "@/lib/data/catalog";
import { formatPln } from "@/lib/format";
import { routing } from "@/i18n/routing";

// The shape of every catalogue slug; anything else cannot be a car, so it never reaches the cache.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 200;

async function findCar(slug: string) {
  if (slug.length > MAX_SLUG_LENGTH || !SLUG_PATTERN.test(slug)) return null;
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

export default async function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Before anything streams, so an unknown car answers with a 404 status.
  const car = await findCar(slug);
  if (!car) notFound();

  // Without the market prices the car is shown, and the cost panel says it cannot be calculated.
  const prices = await getCatalog().then(
    (catalog) => catalog.prices,
    (): null => null,
  );
  return <CarDetails car={car} prices={prices} />;
}
