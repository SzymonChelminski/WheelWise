import type { ReactNode } from "react";
import { Container, SkipLink } from "@/components/layout/SiteShell";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { PowerDetail } from "@/components/ui/CarMeta";
import { CheckboxRow, FilterChip, SegmentedSwitch } from "@/components/ui/Choice";
import { COMPARE_BAR_HINT_ID } from "@/components/ui/CompareBar";
import { CompareToggle } from "@/components/ui/CompareToggle";
import { CostStrip, ValueBar } from "@/components/ui/CostStrip";
import { EarningsScale } from "@/components/ui/EarningsScale";
import {
  CarPageSkeleton,
  ComparisonSkeleton,
  EmptyState,
  InlineError,
  RankingListSkeleton,
} from "@/components/ui/Feedback";
import { NumberField, Select, TextField } from "@/components/ui/Fields";
import { formatDate, formatPln } from "@/components/ui/format";
import {
  Estimate,
  EstimateNote,
  IndicativeTag,
  InfoNote,
  PriceDate,
} from "@/components/ui/Markers";
import { MetricSelector } from "@/components/ui/MetricSelector";
import { RankingList } from "@/components/ui/RankingItem";
import { h1Class, h2Class, linkClass, panelClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import {
  mockCar,
  mockCarElectric,
  mockCarLongName,
  mockCompareThree,
  mockCosts,
  mockIncomeRanges,
  mockRankingByTotalCost,
} from "@/mocks/cars";
import { copy } from "@/mocks/copy";
import { CostRow, PreviewAssumptions, PreviewSearch } from "../_components/parts";
import { Freshness, PreviewCompareBar, PreviewShell } from "../_components/PreviewShell";
import {
  assertDesignPreview,
  carMeta,
  carName,
  earningsLevels,
  P,
  powerKind,
  powerValue,
  shares,
  toLocale,
} from "../_lib/view";

/* Component and state gallery. Labels of this page itself are in English: it is a tool for the team. */

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className={h2Class}>{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs text-ink-muted">{label}</p>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "text"];

export default async function ComponentsPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  assertDesignPreview();
  const locale = toLocale((await params).locale);
  const t = copy[locale];
  const items = mockRankingByTotalCost.slice(0, 5);
  const longItem = mockRankingByTotalCost[9];
  const max = longItem.value;

  return (
    <PreviewShell locale={locale} path={`${P}/components`}>
      <Container className="py-8 md:py-12">
        <h1 className={h1Class}>Components and states</h1>

        <Block title="Skip link (shown as focused)">
          <SkipLink>{t.common.skip}</SkipLink>
          <a
            href="#main"
            data-demo="focus"
            className="inline-flex min-h-11 items-center rounded-md bg-signal px-4 font-semibold text-on-signal"
          >
            {t.common.skip}
          </a>
        </Block>

        <Block title="Button">
          {VARIANTS.map((variant) => (
            <Row key={variant} label={`${variant}: default, hover, focus, active, disabled, loading`}>
              <Button variant={variant}>{t.rankings.showMore}</Button>
              <Button variant={variant} demo="hover">
                {t.rankings.showMore}
              </Button>
              <Button variant={variant} demo="focus">
                {t.rankings.showMore}
              </Button>
              <Button variant={variant} demo="active">
                {t.rankings.showMore}
              </Button>
              <Button variant={variant} disabled>
                {t.rankings.showMore}
              </Button>
              <Button variant={variant} loading>
                {t.rankings.showMore}
              </Button>
            </Row>
          ))}
          <Row label="small, with icon">
            <Button size="sm">{t.assumptions.change}</Button>
            <Button size="sm" variant="secondary" icon="refresh">
              {t.common.retry}
            </Button>
            <Button size="sm" variant="text">
              {t.filters.clear}
            </Button>
          </Row>
          <div data-surface="dark" className="rounded-lg bg-brand-deep p-4">
            <Row label="">
              <Button variant="signal" icon="compare">
                {t.compareBar.compare(2)}
              </Button>
              <Button variant="signal" icon="compare" demo="hover">
                {t.compareBar.compare(2)}
              </Button>
              <Button variant="signal" icon="compare" demo="focus">
                {t.compareBar.compare(2)}
              </Button>
              <Button variant="signal" icon="compare" disabled>
                {t.compareBar.compareIdle}
              </Button>
            </Row>
          </div>
        </Block>

        <Block title="Search combobox">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-ink-muted">closed</p>
              <PreviewSearch locale={locale} />
            </div>
            <div>
              <p className="mb-2 text-xs text-ink-muted">keyboard focus</p>
              <PreviewSearch locale={locale} demo="focus" />
            </div>
            <div className="min-h-80">
              <p className="mb-2 text-xs text-ink-muted">
                open with results, second option active
              </p>
              <PreviewSearch
                locale={locale}
                defaultQuery="sandero"
                defaultOpen
                demoActiveIndex={1}
              />
            </div>
            <div className="min-h-80">
              <p className="mb-2 text-xs text-ink-muted">no results</p>
              <PreviewSearch locale={locale} defaultQuery="trabant" defaultOpen />
            </div>
            <div className="min-h-80">
              <p className="mb-2 text-xs text-ink-muted">
                open with long names: every name is printed in full
              </p>
              <PreviewSearch locale={locale} defaultQuery="hybride rechargeable" defaultOpen />
            </div>
            <div className="min-h-64">
              <p className="mb-2 text-xs text-ink-muted">open with the 103-character name</p>
              <PreviewSearch locale={locale} defaultQuery="compass" defaultOpen />
            </div>
          </div>
        </Block>

        <Block title="Ranking item">
          <p className="text-xs text-ink-muted">
            default, hover, focus, in comparison, comparison full, 103-character name
          </p>
          <RankingList label="Ranking item states">
            <CostRow item={items[0]} locale={locale} max={max} compare="off" />
            <CostRow item={items[1]} locale={locale} max={max} compare="off" demo="hover" />
            <CostRow item={items[2]} locale={locale} max={max} compare="off" demo="focus" />
            <CostRow item={items[3]} locale={locale} max={max} compare="on" />
            <CostRow item={items[4]} locale={locale} max={max} compare="full" />
            <CostRow item={longItem} locale={locale} max={max} compare="off" />
          </RankingList>
        </Block>

        <Block title="Compare toggle">
          <Row label="off, in comparison, full (alone on a page: the reason is printed under it)">
            <CompareToggle size="md" pressed={false} carName={carName(mockCar)} labels={t.compareToggle} />
            <CompareToggle size="md" pressed carName={carName(mockCar)} labels={t.compareToggle} />
            <CompareToggle
              size="md"
              pressed={false}
              full
              showHint
              carName={carName(mockCar)}
              labels={t.compareToggle}
            />
          </Row>
        </Block>

        <Block title="Power labels: petrol, hybrid, electric">
          <div className="grid gap-4 md:grid-cols-3">
            {[mockCar, mockCarLongName, mockCarElectric].map((car) => {
              const power = t.power[powerKind(car)];
              return (
                <div key={car.slug} className={`${panelClass} p-4`}>
                  <p className="text-xs text-ink-muted">
                    {t.attr.fuel[car.fuelType]}: short form in a list
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">{carMeta(car, locale)}</p>
                  <p className="mt-4 text-xs text-ink-muted">full form</p>
                  <dl className="mt-1">
                    <dt className="text-xs text-ink-muted">{power.label}</dt>
                    <dd className="mt-0.5 text-base font-medium text-ink">
                      <PowerDetail
                        value={powerValue(car, locale)}
                        note={
                          power.note && (
                            <>
                              {power.note}{" "}
                              <Link
                                href={`${P}/methodology#${t.power.methodologyAnchor}`}
                                className={linkClass}
                              >
                                {t.power.methodologyLink}
                              </Link>
                            </>
                          )
                        }
                      />
                    </dd>
                  </dl>
                </div>
              );
            })}
          </div>
        </Block>

        <Block title="Notes: consumption ranking (two variants), car that stands for several versions">
          <InfoNote>{t.rankings.consumptionNote}</InfoNote>
          <InfoNote>{t.rankings.consumptionNoteElectric}</InfoNote>
          <InfoNote>{t.car.versionsNote}</InfoNote>
        </Block>

        <Block title="Metric selector">
          <MetricSelector
            id="gallery-metric"
            current="fuelCost"
            labels={{ label: t.rankings.metricLabel }}
            metrics={Object.entries(t.metrics).map(([key, metric]) => ({
              key,
              label: metric.label,
              href: `${P}/rankings?metric=${key}`,
            }))}
          />
        </Block>

        <Block title="Filter controls">
          <Row label="chip: default, hover, focus, active, disabled">
            <FilterChip name="g-chip" value="a" count="31">
              {t.attr.body.estate}
            </FilterChip>
            <FilterChip name="g-chip" value="b" count="163" demo="hover">
              {t.attr.body.suv}
            </FilterChip>
            <FilterChip name="g-chip" value="c" count="22" demo="focus">
              {t.attr.body.mpv}
            </FilterChip>
            <FilterChip name="g-chip" value="d" count="148" defaultChecked>
              {t.attr.body.sedan_hatchback}
            </FilterChip>
            <FilterChip name="g-chip" value="e" count="0" disabled>
              {t.attr.fuel.lpg}
            </FilterChip>
          </Row>
          <div className={`${panelClass} max-w-xs p-1`}>
            <CheckboxRow name="g-make" value="bmw" count="31">
              BMW
            </CheckboxRow>
            <CheckboxRow name="g-make" value="dacia" count="11" defaultChecked>
              Dacia
            </CheckboxRow>
            <CheckboxRow name="g-make" value="tesla" count="0" disabled>
              Tesla
            </CheckboxRow>
          </div>
        </Block>

        <Block title="Numeric input, text input, select">
          <div className="grid max-w-3xl gap-5 sm:grid-cols-3">
            <NumberField
              id="g-km-1"
              label={t.assumptions.mileage}
              unit={t.assumptions.mileageUnit}
              hint={t.assumptions.mileageHint}
              defaultValue="15000"
            />
            <NumberField
              id="g-km-2"
              label={t.assumptions.mileage}
              unit={t.assumptions.mileageUnit}
              hint={t.assumptions.mileageHint}
              defaultValue="15000"
              demo="focus"
            />
            <NumberField
              id="g-km-3"
              label={t.assumptions.mileage}
              unit={t.assumptions.mileageUnit}
              error={t.assumptions.mileageError}
              defaultValue="250"
            />
            <Select id="g-years" label={t.assumptions.years} defaultValue="5">
              {t.assumptions.yearOptions.map((text, index) => (
                <option key={text} value={index + 1}>
                  {text}
                </option>
              ))}
            </Select>
            <TextField
              id="g-q"
              label={t.filters.query}
              placeholder={t.filters.queryPlaceholder}
              leadingIcon="search"
            />
            <NumberField
              id="g-km-4"
              label={t.assumptions.premium}
              unit={t.assumptions.premiumUnit}
              defaultValue="2400"
              disabled
            />
          </div>
        </Block>

        <Block title="Segmented switch">
          <Row label="month / year">
            <SegmentedSwitch
              name="g-period"
              legend={t.period.legend}
              defaultValue="month"
              options={[
                { value: "month", label: t.period.month },
                { value: "year", label: t.period.year },
              ]}
            />
            <SegmentedSwitch
              name="g-period-2"
              legend={t.period.legend}
              defaultValue="year"
              options={[
                { value: "month", label: t.period.month },
                { value: "year", label: t.period.year },
              ]}
            />
          </Row>
        </Block>

        <Block title="Assumptions panel">
          <div className="grid max-w-3xl gap-6 md:grid-cols-2">
            <div className={`${panelClass} p-5`}>
              <PreviewAssumptions locale={locale} idPrefix="g-est" />
            </div>
            <div className={`${panelClass} p-5`}>
              <PreviewAssumptions
                locale={locale}
                idPrefix="g-own"
                values={{ insuranceMode: "custom", annualMileageKm: "250", annualPremiumPln: "abc" }}
                errors={{
                  annualMileageKm: t.assumptions.mileageError,
                  annualPremiumPln: t.assumptions.premiumError,
                }}
              />
            </div>
          </div>
        </Block>

        <Block title="Cost strip">
          <div className="max-w-xl space-y-4">
            <CostStrip shares={shares(mockCosts[mockCar.slug])} size="lg" />
            <CostStrip shares={shares(mockCosts[mockCar.slug])} />
            <CostStrip shares={shares(mockCosts[mockCar.slug])} ratio={0.7} emphasis="insurance" />
            <ValueBar ratio={0.55} />
          </div>
        </Block>

        <Block title="Earnings scale">
          <EarningsScale levels={earningsLevels(mockIncomeRanges[mockCar.slug], locale)} />
        </Block>

        <Block title="Markers">
          <Row label="estimate, indicative price, price date, data freshness">
            <span className="font-display text-xl font-semibold tabular-nums">
              <Estimate srLabel={t.common.estimateSr}>{formatPln(1308, locale)}</Estimate>
            </span>
            <IndicativeTag>{t.common.indicative}</IndicativeTag>
          </Row>
          <EstimateNote>{t.rankings.estimateNote}</EstimateNote>
          <PriceDate
            label={t.car.priceDate}
            isoDate={mockCar.priceObservedAt}
            dateText={formatDate(mockCar.priceObservedAt, locale)}
          />
          <Freshness locale={locale} />
        </Block>

        <Block title="Comparison bar, closed: 0, 1, 2 and 3 cars (3 = full)">
          {[0, 1, 2, 3].map((count) => (
            <PreviewCompareBar
              key={count}
              locale={locale}
              slugs={mockCompareThree.slice(0, count)}
              position="static"
              // The full bar describes the full toggle shown under "Ranking item".
              hintId={count === 3 ? COMPARE_BAR_HINT_ID : undefined}
              showWhenEmpty
            />
          ))}
        </Block>

        <Block title="Comparison bar, list open: 1, 2 and 3 cars">
          {[1, 2, 3].map((count) => (
            <PreviewCompareBar
              key={count}
              locale={locale}
              slugs={mockCompareThree.slice(0, count)}
              position="static"
              defaultExpanded
            />
          ))}
        </Block>

        <Block title="Comparison bar: a fourth car was tried">
          <PreviewCompareBar
            locale={locale}
            slugs={mockCompareThree}
            position="static"
            limitReached
          />
        </Block>

        <Block title="Empty result and inline error">
          <EmptyState
            title={t.rankings.emptyTitle}
            headingLevel="h3"
            actions={<Button variant="secondary">{t.filters.clear}</Button>}
          >
            <p>{t.rankings.emptyText}</p>
          </EmptyState>
          <InlineError
            title={t.rankings.errorTitle}
            action={
              <Button variant="secondary" size="sm" icon="refresh">
                {t.common.retry}
              </Button>
            }
          >
            <p>{t.rankings.errorText}</p>
          </InlineError>
        </Block>

        <Block title="Loading skeletons: list, car page, comparison">
          <RankingListSkeleton rows={3} label={t.rankings.loading} />
          <CarPageSkeleton label={t.car.loading} />
          <ComparisonSkeleton label={t.compare.loading} />
        </Block>
      </Container>
    </PreviewShell>
  );
}
