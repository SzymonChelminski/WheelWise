import { Container } from "@/components/layout/SiteShell";
import { AssumptionsSummary } from "@/components/ui/AssumptionsPanel";
import { Button } from "@/components/ui/Button";
import { SegmentedSwitch } from "@/components/ui/Choice";
import { EmptyState, InlineError, RankingListSkeleton } from "@/components/ui/Feedback";
import { ActiveFilters, ClearFiltersButton, FiltersHeading } from "@/components/ui/FiltersPanel";
import { formatInteger, type Locale } from "@/components/ui/format";
import { EstimateNote, InfoNote } from "@/components/ui/Markers";
import { MetricSelector } from "@/components/ui/MetricSelector";
import { RankingList } from "@/components/ui/RankingItem";
import { SheetDisclosure } from "@/components/ui/Sheet";
import { SortDirectionSwitch } from "@/components/ui/SortDirection";
import { h1Class, h2Class, linkClass, panelClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import {
  mockCompareThree,
  mockCompareTwo,
  mockFilteredSize,
  mockLongNamesByTotalCost,
  mockRankingByConsumption,
  mockRankingByTotalCost,
} from "@/mocks/cars";
import { copy } from "@/mocks/copy";
import { P } from "../_lib/view";
import {
  activeFilterItems,
  assumptionsSummary,
  ConsumptionRow,
  CostRow,
  PreviewAssumptions,
  PreviewFilters,
} from "./parts";
import { PreviewShell } from "./PreviewShell";

export type RankingsState =
  | "list"
  | "filters-open"
  | "assumptions-open"
  | "empty"
  | "error"
  | "loading"
  /** Three cars are selected and the user has just tried to add a fourth. */
  | "full"
  /** Ranking by fuel consumption, with the note about what it leaves out. */
  | "consumption"
  /** Five cars whose names have about 100 characters. */
  | "long-names"
  /** Order "highest first": the same cars from the most expensive, ranks counted from 1 again. */
  | "desc"
  /** No filter is on: no chips, no badge, "Wyczyść filtry" in its disabled look. */
  | "no-filters"
  /** The filters sheet open with no filter on. */
  | "filters-open-none";

export function RankingsScreen({
  locale,
  path,
  state = "list",
}: {
  locale: Locale;
  path: string;
  state?: RankingsState;
}) {
  const t = copy[locale];
  const consumption = state === "consumption";
  const dir = state === "desc" ? "desc" : "asc";
  const ascending = consumption
    ? mockRankingByConsumption
    : state === "long-names"
      ? mockLongNamesByTotalCost
      : mockRankingByTotalCost;
  // Descending: the same rows reversed; the rank is the position in the order shown.
  const items =
    dir === "desc"
      ? [...ascending].reverse().map((item, index) => ({ ...item, rank: index + 1 }))
      : ascending;
  const max = Math.max(...items.map((item) => item.value));
  const total = formatInteger(mockFilteredSize, locale);
  const noFilters = state === "no-filters" || state === "filters-open-none";
  const filters = noFilters ? [] : activeFilterItems(locale);
  const clearButton = (
    <ClearFiltersButton label={t.filters.clear} active={!noFilters} />
  );
  const selected = state === "full" ? mockCompareThree : mockCompareTwo;
  const metric = consumption ? "fuelConsumption" : "totalCost";
  const title = consumption
    ? t.metrics.fuelConsumption.label
    : t.rankings.listTitle(t.metrics.totalCost.label, t.common.perMonth);
  const showsList = !["empty", "error", "loading"].includes(state);
  const toggleState = (slug: string) =>
    selected.includes(slug) ? "on" : selected.length >= 3 ? "full" : "off";

  return (
    <PreviewShell
      locale={locale}
      path={path}
      current="rankings"
      compareSlugs={selected}
      limitReached={state === "full"}
    >
      <Container className="py-8 md:py-12">
        <h1 className={h1Class}>{t.rankings.title}</h1>

        <MetricSelector
          className="mt-6"
          current={metric}
          labels={{ label: t.rankings.metricLabel }}
          metrics={Object.entries(t.metrics).map(([key, item]) => ({
            key,
            label: item.label,
            href: `${P}/rankings?metric=${key}`,
          }))}
        />

        <div className="mt-6 grid gap-8 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
          <aside aria-label={t.filters.title} className="hidden lg:block">
            <div className={`${panelClass} p-5`}>
              <FiltersHeading title={t.filters.title} action={clearButton} />
              <PreviewFilters locale={locale} idPrefix="side" noFilters={noFilters} />
            </div>
          </aside>

          <section aria-labelledby="ranking-title" className="min-w-0">
            <AssumptionsSummary
              label={t.assumptions.title}
              summary={assumptionsSummary(locale)}
              action={
                <SheetDisclosure
                  triggerLabel={t.assumptions.change}
                  triggerSize="sm"
                  title={t.assumptions.title}
                  closeLabel={t.common.close}
                  applyLabel={t.assumptions.done}
                  defaultOpen={state === "assumptions-open"}
                >
                  <PreviewAssumptions locale={locale} idPrefix="sheet-a" />
                </SheetDisclosure>
              }
            />

            <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <div>
                <h2 id="ranking-title" className={h2Class}>
                  {title}
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted" aria-live="polite">
                  {state === "empty" ? t.common.cars(0, "0") : t.common.cars(mockFilteredSize, total)}
                </p>
              </div>
              {/* Below 640 px the controls fill the row: one tidy column at 320 px, two rows at 375 px. */}
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <SheetDisclosure
                  className="max-sm:grow lg:hidden"
                  triggerLabel={t.filters.title}
                  triggerIcon="sliders"
                  badge={filters.length > 0 ? String(filters.length) : undefined}
                  title={t.filters.title}
                  closeLabel={t.common.close}
                  applyLabel={t.filters.apply(mockFilteredSize, total)}
                  defaultOpen={state === "filters-open" || state === "filters-open-none"}
                  headerAction={clearButton}
                >
                  <PreviewFilters locale={locale} idPrefix="sheet-f" noFilters={noFilters} />
                </SheetDisclosure>
                {/* Price and consumption do not depend on the period: no switch. */}
                {!consumption && (
                  <SegmentedSwitch
                    name="period"
                    fullWidth="narrow"
                    className="max-sm:grow"
                    legend={t.period.legend}
                    defaultValue="month"
                    options={[
                      { value: "month", label: t.period.month },
                      { value: "year", label: t.period.year },
                    ]}
                  />
                )}
                <SortDirectionSwitch labels={t.rankings.order} defaultValue={dir} />
              </div>
            </div>

            <ActiveFilters
              className="mt-4"
              items={filters}
              labels={{
                list: t.filters.activeList,
                remove: t.filters.remove,
                clear: t.filters.clear,
              }}
            />

            <div className="mt-4">
              {state === "empty" && (
                <EmptyState
                  title={t.rankings.emptyTitle}
                  headingLevel="h3"
                  actions={<Button variant="secondary">{t.filters.clear}</Button>}
                >
                  <p>{t.rankings.emptyText}</p>
                </EmptyState>
              )}
              {state === "error" && (
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
              )}
              {state === "loading" && <RankingListSkeleton rows={5} label={t.rankings.loading} />}
              {showsList && (
                <>
                  <RankingList label={t.rankings.listLabel(title, dir)}>
                    {items.map((item) =>
                      consumption ? (
                        <ConsumptionRow
                          key={item.car.slug}
                          item={item}
                          locale={locale}
                          max={max}
                          compare={toggleState(item.car.slug)}
                        />
                      ) : (
                        <CostRow
                          key={item.car.slug}
                          item={item}
                          locale={locale}
                          max={max}
                          compare={toggleState(item.car.slug)}
                        />
                      ),
                    )}
                  </RankingList>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <p className="text-sm text-ink-muted">
                      {t.rankings.showing(formatInteger(items.length, locale), total)}
                    </p>
                    <Button variant="secondary">{t.rankings.showMore}</Button>
                  </div>
                  {consumption ? (
                    <InfoNote className="mt-6">{t.rankings.consumptionNote}</InfoNote>
                  ) : (
                    <EstimateNote className="mt-6">
                      {t.rankings.estimateNote}{" "}
                      <Link href={`${P}/methodology`} className={linkClass}>
                        {t.common.howWeCount}
                      </Link>
                    </EstimateNote>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </Container>
    </PreviewShell>
  );
}
