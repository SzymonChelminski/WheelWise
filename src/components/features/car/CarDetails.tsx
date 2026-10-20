import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Container } from "@/components/layout/SiteShell";
import { PowerDetail } from "@/components/ui/CarMeta";
import { CarName, nameWrapClass } from "@/components/ui/CarName";
import { CarPhoto, type CarPhotoLabels } from "@/components/ui/CarPhoto";
import { cn } from "@/components/ui/cn";
import { CarPageSkeleton } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { IndicativeTag, InfoNote, PriceDate } from "@/components/ui/Markers";
import { h1Class, h2Class, linkClass, panelClass } from "@/components/ui/styles";
import { getModelImage } from "@/lib/catalog/model-images";
import type { Car, MarketPrices } from "@/lib/domain/types";
import { formatDate, formatPln, type Locale } from "@/lib/format";
import { AssumptionsControls } from "../assumptions/AssumptionsControls";
import { AssumptionsRestore } from "../assumptions/AssumptionsRestore";
import { CompareToggleButton } from "../compare/CompareToggleButton";
import { LoadError } from "../ListError";
import { PageLink } from "../PageLink";
import { CarCostSection } from "./CarCostSection";
import { carName, carNameWithAttributes } from "./car-view";
import { consumptionText, engineSizeText, powerLabel, powerNotes, powerValue } from "./car-format";

/** The address of the price source, or null when it is not a web address. */
function sourceLink(url: string): string | null {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** A market price the cost engine can work with. */
function usable(prices: MarketPrices): boolean {
  return Object.values(prices).every((price) => Number.isFinite(price.pricePln) && price.pricePln > 0);
}

/**
 * The frame of the car page: back link and the room for the car. What goes inside is rendered
 * behind a boundary, so the page is sent before the car it shows is known.
 */
export async function CarFrame({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <Container className="py-6 md:py-10">
      <AssumptionsRestore />
      <nav aria-label={t("car.breadcrumb")}>
        <PageLink
          to={{ kind: "carry", path: "/rankings" }}
          className={`${linkClass} inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold`}
        >
          <Icon name="arrow-left" size={16} />
          {t("header.rankings")}
        </PageLink>
      </nav>

      <Suspense fallback={<CarPageSkeleton label={t("car.loading")} />}>{children}</Suspense>
    </Container>
  );
}

/*
 * Rendered for each request, so that the client components below (they read the query of the
 * page) are rendered on the server for the address that was asked for. `prices` is null when the
 * market prices could not be read; the cost panel is then replaced by an error and nothing else changes.
 */
export async function CarContent({ car, prices }: { car: Car; prices: MarketPrices | null }) {
  await connection();
  const [t, locale] = await Promise.all([getTranslations(), getLocale() as Promise<Locale>]);
  const name = carName(car);
  const href = sourceLink(car.priceSourceUrl);
  const notes = powerNotes(t, car);
  const anchor = t("power.methodologyAnchor");
  // The component fills the {name}, {author}, {license} and {source} placeholders itself.
  const photoText = (key: keyof CarPhotoLabels): string => t.raw(`car.photo.${key}`) as string;
  const photoLabels: CarPhotoLabels = {
    alt: photoText("alt"),
    marker: photoText("marker"),
    credit: photoText("credit"),
    creditPublicDomain: photoText("creditPublicDomain"),
    publicDomain: photoText("publicDomain"),
    source: photoText("source"),
    unknownAuthor: photoText("unknownAuthor"),
  };

  const attributes: [string, ReactNode][] = [
    [t("car.body"), t(`attr.body.${car.bodyType}`)],
    [t("car.segment"), t(`attr.segment.${car.segment}`)],
    [t("car.fuel"), t(`attr.fuel.${car.fuelType}`)],
    [t("car.transmission"), t(`attr.transmission.${car.transmission}`)],
    [
      powerLabel(t, car),
      <PowerDetail
        key="power"
        value={powerValue(t, locale, car)}
        note={
          notes && (
            <>
              {notes.sentence}{" "}
              <PageLink to={{ kind: "carry", path: `/methodology#${anchor}` }} className={linkClass}>
                {t("power.methodologyLink")}
              </PageLink>
            </>
          )
        }
      />,
    ],
    [t("car.engine"), engineSizeText(t, locale, car)],
    [t("car.consumption"), consumptionText(t, locale, car)],
  ];

  return (
    // From 1024 px the photo takes the top of the right column beside the name and price and the
    // assumptions aside starts under it. Without a photo (none, or it failed to load) dense placement
    // moves the aside up to the top, as on a page without photos.
    <div className="mt-2 lg:grid lg:grid-flow-row-dense lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-10">
      <div className="min-w-0 lg:col-start-1">
        <h1 className={`${h1Class} ${nameWrapClass}`}>
          <CarName>{name}</CarName>
        </h1>

        <div className="mt-6">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-display text-3xl font-semibold text-ink tabular-nums">
              {formatPln(car.listPricePln, locale)}
            </span>
            <IndicativeTag>{t("common.indicative")}</IndicativeTag>
          </p>
          <p className="mt-2 max-w-md text-sm text-ink-muted">{t("car.priceExplain")}</p>
          <PriceDate
            className="mt-2"
            label={t("car.priceDate")}
            isoDate={car.priceObservedAt}
            dateText={formatDate(car.priceObservedAt, locale)}
          >
            {", "}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} inline-flex min-h-6 items-center gap-1`}
              >
                {t("car.source")}
                <Icon name="external" size={16} />
              </a>
            ) : (
              t("car.source")
            )}
          </PriceDate>
          <InfoNote className="mt-4 max-w-md">{t("car.versionsNote")}</InfoNote>
          <CompareToggleButton
            standalone
            className="mt-5"
            slug={car.slug}
            name={carNameWithAttributes(t, locale, car)}
          />
        </div>
      </div>

      <CarPhoto
        className="mt-8 max-w-md lg:col-start-2 lg:mt-0 lg:max-w-none lg:self-start"
        photo={getModelImage(car)}
        carName={name}
        labels={photoLabels}
      />

      <div className="min-w-0 lg:col-start-1">
        <section aria-label={t("car.attributes")} className="mt-8">
          <h2 className="sr-only">
            {t("car.attributes")}
          </h2>
          <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-3 xl:grid-cols-4">
            {attributes.map(([term, value]) => (
              <div
                key={term}
                className={cn(
                  "-mb-px border-b border-line py-3 pr-6",
                  // A power value with its explanation needs two columns.
                  notes && term === powerLabel(t, car) && "col-span-2",
                )}
              >
                <dt className="text-xs text-ink-muted">{term}</dt>
                <dd className="mt-0.5 text-base font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {prices && usable(prices) ? (
          <CarCostSection car={car} prices={prices} />
        ) : (
          <section aria-label={t("car.costTitle")} className="mt-12">
            <h2 className={h2Class}>
              {t("car.costTitle")}
            </h2>
            <LoadError title={t("car.costErrorTitle")} className="mt-4">
              <p>{t("car.costErrorText")}</p>
            </LoadError>
          </section>
        )}
      </div>

      <aside
        aria-label={t("assumptions.title")}
        className="hidden lg:col-start-2 lg:row-span-2 lg:block lg:[[data-car-photo]~&]:mt-8"
      >
        <div className={`${panelClass} sticky top-6 p-5`}>
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">
            {t("assumptions.title")}
          </h2>
          <AssumptionsControls />
        </div>
      </aside>
    </div>
  );
}
