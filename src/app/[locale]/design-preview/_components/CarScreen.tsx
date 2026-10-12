import type { ReactNode } from "react";
import { Container } from "@/components/layout/SiteShell";
import { AssumptionsSummary } from "@/components/ui/AssumptionsPanel";
import { PowerDetail } from "@/components/ui/CarMeta";
import { CarName, nameWrapClass } from "@/components/ui/CarName";
import { SegmentedSwitch } from "@/components/ui/Choice";
import { cn } from "@/components/ui/cn";
import { CompareToggle } from "@/components/ui/CompareToggle";
import { CostBreakdown } from "@/components/ui/CostBreakdown";
import { EarningsScale } from "@/components/ui/EarningsScale";
import {
  formatDate,
  formatInteger,
  formatPercent,
  formatPln,
  formatPlnExact,
  type Locale,
} from "@/components/ui/format";
import { Icon } from "@/components/ui/Icon";
import {
  Estimate,
  EstimateNote,
  IndicativeTag,
  InfoNote,
  PriceDate,
} from "@/components/ui/Markers";
import { SheetDisclosure } from "@/components/ui/Sheet";
import { h1Class, h2Class, linkClass, panelClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { mockCosts, mockIncomeRanges } from "@/mocks/cars";
import { copy } from "@/mocks/copy";
import type { Car } from "@/mocks/types";
import {
  breakdownItems,
  carName,
  consumption,
  earningsLevels,
  MOCK_OWNERSHIP_YEARS,
  ownershipText,
  P,
  powerKind,
  powerValue,
} from "../_lib/view";
import { assumptionsSummary, PreviewAssumptions } from "./parts";
import { PreviewShell } from "./PreviewShell";

export function CarScreen({
  locale,
  path,
  car,
  compareSlugs,
}: {
  locale: Locale;
  path: string;
  car: Car;
  /** Cars in the comparison bar. */
  compareSlugs: string[];
}) {
  const t = copy[locale];
  const costs = mockCosts[car.slug];
  const name = carName(car);
  const years = ownershipText(MOCK_OWNERSHIP_YEARS, locale);
  const total = formatPln(costs.perMonth.total, locale);
  const residual = t.car.residual(
    ownershipText(MOCK_OWNERSHIP_YEARS, locale, "after"),
    formatPln(costs.residualValuePln, locale),
    // residualValuePct is a percentage from 0 to 100; formatPercent takes a share from 0 to 1.
    formatPercent(costs.residualValuePct / 100, locale),
  );
  const earningsIntro = t.car.earningsLead(total);
  const inComparison = compareSlugs.includes(car.slug);
  const power = t.power[powerKind(car)];

  const attributes: [string, ReactNode][] = [
    [t.car.body, t.attr.body[car.bodyType]],
    [t.car.segment, t.attr.segment[car.segment]],
    [t.car.fuel, t.attr.fuel[car.fuelType]],
    [t.car.transmission, t.attr.transmission[car.transmission]],
    [
      power.label,
      <PowerDetail
        key="power"
        value={powerValue(car, locale)}
        note={
          power.note && (
            <>
              {power.note}{" "}
              <Link href={`${P}/methodology#${t.power.methodologyAnchor}`} className={linkClass}>
                {t.power.methodologyLink}
              </Link>
            </>
          )
        }
      />,
    ],
    [t.car.engine, car.engineCc ? `${formatInteger(car.engineCc, locale)} cm³` : "–"],
    [t.car.consumption, consumption(car, locale)],
  ];

  return (
    <PreviewShell locale={locale} path={path} current="rankings" compareSlugs={compareSlugs}>
      <Container className="py-6 md:py-10">
        <nav aria-label={t.car.breadcrumb}>
          <Link
            href={`${P}/rankings`}
            className={`${linkClass} inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold`}
          >
            <Icon name="arrow-left" size={16} />
            {t.header.rankings}
          </Link>
        </nav>

        <div className="mt-2 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <h1 className={`${h1Class} ${nameWrapClass}`}>
              <CarName>{name}</CarName>
            </h1>

            <div className="mt-6">
              <div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-display text-3xl font-semibold text-ink tabular-nums">
                    {formatPln(car.listPricePln, locale)}
                  </span>
                  <IndicativeTag>{t.common.indicative}</IndicativeTag>
                </p>
                <p className="mt-2 max-w-md text-sm text-ink-muted">{t.car.priceExplain}</p>
                <PriceDate
                  className="mt-2"
                  label={t.car.priceDate}
                  isoDate={car.priceObservedAt}
                  dateText={formatDate(car.priceObservedAt, locale)}
                >
                  {", "}
                  <a
                    href={car.priceSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${linkClass} inline-flex min-h-6 items-center gap-1`}
                  >
                    {t.car.source}
                    <Icon name="external" size={16} />
                  </a>
                </PriceDate>
                <InfoNote className="mt-4 max-w-md">{t.car.versionsNote}</InfoNote>
              </div>
              <CompareToggle
                className="mt-5"
                size="md"
                pressed={inComparison}
                full={compareSlugs.length >= 3}
                showHint
                carName={name}
                labels={t.compareToggle}
              />
            </div>

            <section aria-labelledby="car-attributes" className="mt-8">
              <h2 id="car-attributes" className="sr-only">
                {t.car.attributes}
              </h2>
              <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-3 xl:grid-cols-4">
                {attributes.map(([term, value]) => (
                  <div
                    key={term}
                    className={cn(
                      "-mb-px border-b border-line py-3 pr-6",
                      // A power value with its explanation needs two columns.
                      term === power.label && power.note && "col-span-2",
                    )}
                  >
                    <dt className="text-xs text-ink-muted">{term}</dt>
                    <dd className="mt-0.5 text-base font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="car-cost" className="mt-12">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <h2 id="car-cost" className={h2Class}>
                  {t.car.costTitle}
                </h2>
                <SegmentedSwitch
                  name="period"
                  legend={t.period.legend}
                  defaultValue="month"
                  options={[
                    { value: "month", label: t.period.month },
                    { value: "year", label: t.period.year },
                  ]}
                />
              </div>

              <AssumptionsSummary
                className="mt-4 lg:hidden"
                label={t.assumptions.title}
                summary={assumptionsSummary(locale)}
                action={
                  <SheetDisclosure
                    triggerLabel={t.assumptions.change}
                    triggerSize="sm"
                    title={t.assumptions.title}
                    closeLabel={t.common.close}
                    applyLabel={t.assumptions.done}
                  >
                    <PreviewAssumptions locale={locale} idPrefix="sheet-a" />
                  </SheetDisclosure>
                }
              />

              <div className={`${panelClass} mt-4 p-4 md:p-6`}>
                <p className="font-display text-4xl font-semibold text-ink tabular-nums">
                  <Estimate srLabel={t.common.estimateSr}>{total}</Estimate>
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  {t.car.costLead(t.common.perMonth, years)}
                </p>
                <CostBreakdown
                  className="mt-6"
                  animate
                  items={breakdownItems(costs, "month", locale)}
                  total={total}
                  labels={{
                    caption: t.costs.caption(t.common.perMonth),
                    category: t.costs.category,
                    amount: t.costs.amount,
                    share: t.costs.share,
                    total: t.costs.total,
                    estimateSr: t.common.estimateSr,
                  }}
                  footer={
                    <>
                      <p>
                        {residual[0]}{" "}
                        <Estimate srLabel={t.common.estimateSr} className="font-semibold text-ink">
                          {residual[1]}
                        </Estimate>{" "}
                        {residual[2]}
                      </p>
                      <p>
                        {t.car.perKm[0]}{" "}
                        <Estimate srLabel={t.common.estimateSr} className="font-semibold text-ink">
                          {formatPlnExact(costs.costPerKm, locale)}
                        </Estimate>
                        {t.car.perKm[1]}
                      </p>
                    </>
                  }
                />
              </div>
              <EstimateNote className="mt-3">
                {t.car.estimateNote}{" "}
                <Link href={`${P}/methodology`} className={linkClass}>
                  {t.common.howWeCount}
                </Link>
              </EstimateNote>
            </section>

            <section aria-labelledby="car-earnings" className="mt-12">
              <h2 id="car-earnings" className={h2Class}>
                {t.car.earningsTitle}
              </h2>
              <p className="mt-2 max-w-prose text-base text-ink-muted">
                {earningsIntro[0]}{" "}
                <Estimate srLabel={t.common.estimateSr} className="font-semibold text-ink">
                  {earningsIntro[1]}
                </Estimate>{" "}
                {earningsIntro[2]}
              </p>
              <EarningsScale
                className="mt-5"
                levels={earningsLevels(mockIncomeRanges[car.slug], locale)}
              />
            </section>
          </div>

          <aside aria-labelledby="car-assumptions" className="hidden lg:block">
            <div className={`${panelClass} sticky top-6 p-5`}>
              <h2 id="car-assumptions" className="mb-4 font-display text-xl font-semibold text-ink">
                {t.assumptions.title}
              </h2>
              <PreviewAssumptions locale={locale} idPrefix="side-a" />
            </div>
          </aside>
        </div>
      </Container>
    </PreviewShell>
  );
}
