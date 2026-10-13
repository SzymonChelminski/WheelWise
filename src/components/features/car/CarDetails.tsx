import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Container } from "@/components/layout/SiteShell";
import { PowerDetail } from "@/components/ui/CarMeta";
import { CarName, nameWrapClass } from "@/components/ui/CarName";
import { cn } from "@/components/ui/cn";
import { CarPageSkeleton } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { IndicativeTag, InfoNote, PriceDate } from "@/components/ui/Markers";
import { h1Class, h2Class, linkClass, panelClass } from "@/components/ui/styles";
import type { Car, MarketPrices } from "@/lib/domain/types";
import { formatDate, formatPln, type Locale } from "@/lib/format";
import { AssumptionsControls } from "../assumptions/AssumptionsControls";
import { CompareToggleButton } from "../compare/CompareToggleButton";
import { LoadError } from "../ListError";
import { PageLink } from "../PageLink";
import { CarCostSection } from "./CarCostSection";
import { carName } from "./car-view";
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
 * The car page: identity and price, attributes, the cost of ownership and the earnings
 * scale, with the assumptions in an aside from 1024 px. `prices` is null when the market
 * prices could not be read; the cost panel is then replaced by an error and nothing else changes.
 */
export async function CarDetails({ car, prices }: { car: Car; prices: MarketPrices | null }) {
  const t = await getTranslations();

  return (
    <Container className="py-6 md:py-10">
      <nav aria-label={t("car.breadcrumb")}>
        <PageLink
          to={{ kind: "carry", path: "/rankings" }}
          className={`${linkClass} inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold`}
        >
          <Icon name="arrow-left" size={16} />
          {t("header.rankings")}
        </PageLink>
      </nav>

      <Suspense fallback={<CarPageSkeleton label={t("car.loading")} />}>
        <CarContent car={car} prices={prices} />
      </Suspense>
    </Container>
  );
}

/*
 * Rendered for each request, so that the client components below (they read the query of the
 * page) are rendered on the server for the address that was asked for.
 */
async function CarContent({ car, prices }: { car: Car; prices: MarketPrices | null }) {
  await connection();
  const [t, locale] = await Promise.all([getTranslations(), getLocale() as Promise<Locale>]);
  const name = carName(car);
  const href = sourceLink(car.priceSourceUrl);
  const notes = powerNotes(t, car);
  const anchor = t("power.methodologyAnchor");

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
    <div className="mt-2 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
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
          <CompareToggleButton standalone className="mt-5" slug={car.slug} name={name} />
        </div>

        <section aria-labelledby="car-attributes" className="mt-8">
          <h2 id="car-attributes" className="sr-only">
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
          <section aria-labelledby="car-cost" className="mt-12">
            <h2 id="car-cost" className={h2Class}>
              {t("car.costTitle")}
            </h2>
            <LoadError title={t("car.costErrorTitle")} className="mt-4">
              <p>{t("car.costErrorText")}</p>
            </LoadError>
          </section>
        )}
      </div>

      <aside aria-labelledby="car-assumptions" className="hidden lg:block">
        <div className={`${panelClass} sticky top-6 p-5`}>
          <h2 id="car-assumptions" className="mb-4 font-display text-xl font-semibold text-ink">
            {t("assumptions.title")}
          </h2>
          <AssumptionsControls idPrefix="side-a" />
        </div>
      </aside>
    </div>
  );
}
