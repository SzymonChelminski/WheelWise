import { getLocale, getTranslations } from "next-intl/server";
import { AssumptionsSummary } from "@/components/ui/AssumptionsPanel";
import { EmptyState } from "@/components/ui/Feedback";
import { EstimateNote, InfoNote } from "@/components/ui/Markers";
import { RankingList } from "@/components/ui/RankingItem";
import { SheetDisclosure } from "@/components/ui/Sheet";
import { h2Class, linkClass, panelClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { rankCars } from "@/lib/costs";
import { getCatalog } from "@/lib/data/catalog";
import { parseAssumptions } from "@/lib/domain/assumptions";
import type { Car } from "@/lib/domain/types";
import { formatInteger, formatPln, type Locale } from "@/lib/format";
import {
  pickAssumptionParams,
  toSearchParams,
  withQuery,
  type RawParams,
} from "@/lib/state/assumption-params";
import { AssumptionsControls } from "../assumptions/AssumptionsControls";
import { PeriodSwitch } from "../assumptions/PeriodSwitch";
import { assumptionsSummary } from "../assumptions/summary";
import { PowerNote } from "../car/PowerNote";
import { ActiveFiltersControl, type ActiveFilterItem } from "./ActiveFiltersControl";
import { MetricSelectorControl } from "./MetricSelectorControl";
import {
  BODY_TYPES,
  countActiveFilters,
  FUEL_TYPES,
  PAGE_SIZE,
  parseRankingParams,
  RANKING_METRICS,
  rankingsHref,
  SEGMENTS,
  toFilters,
  type RankingParams,
} from "./params";
import { RankingFilters, type FilterOptionData, type FilterOptions } from "./RankingFilters";
import { RESULTS_HEADING_ID, ResultsFocus, ResultsLink } from "./results-focus";
import { isPeriodIndependent, metricAmount, RankingRow } from "./RankingRow";

function countBy(values: string[], order?: readonly string[]): FilterOptionData[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const keys = order ? order.filter((value) => counts.has(value)) : [...counts.keys()];
  return keys.map((value) => ({ value, count: counts.get(value) ?? 0 }));
}

/** Only the options that exist in the catalogue, with the number of cars behind each. */
function filterOptions(cars: Car[], locale: Locale): FilterOptions {
  const makes = countBy(cars.map((car) => car.make)).sort((a, b) =>
    a.value.localeCompare(b.value, locale),
  );
  return {
    body: countBy(cars.map((car) => car.bodyType), BODY_TYPES),
    fuel: countBy(cars.map((car) => car.fuelType), FUEL_TYPES),
    segment: countBy(cars.map((car) => car.segment), SEGMENTS),
    make: makes,
  };
}

function isElectricOnly(params: RankingParams): boolean {
  return params.fuelTypes.length === 1 && params.fuelTypes[0] === "ev";
}

/** The ranking page below its heading: metric selector, filters, assumptions and the list. */
export async function RankingsContent({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const [{ cars, prices }, t, locale] = await Promise.all([
    getCatalog(),
    getTranslations(),
    getLocale() as Promise<Locale>,
  ]);

  const { assumptions, period } = parseAssumptions(raw);
  const params = parseRankingParams(raw, [...new Set(cars.map((car) => car.make))]);
  const { metric, limit } = params;
  const carry = pickAssumptionParams(toSearchParams(raw));
  const carryQuery = carry.toString();

  const ranked = rankCars(cars, prices, assumptions, metric, toFilters(params));
  const visible = ranked.slice(0, limit);
  const maxAmount = Math.max(0, ...visible.map((item) => metricAmount(item, metric, period)));
  const electricOnly = isElectricOnly(params);
  const options = filterOptions(cars, locale);
  const activeCount = countActiveFilters(params);

  const periodText = period === "year" ? t("common.perYear") : t("common.perMonth");
  const metricLabel = t(`metrics.${metric}.label`);
  const title = isPeriodIndependent(metric)
    ? metricLabel
    : t("rankings.listTitle", { metric: metricLabel, period: periodText });
  const carsText = (count: number) => t("common.cars", { count });
  const methodologyHref = withQuery("/methodology", carry);

  const activeItems: ActiveFilterItem[] = [
    ...params.makes.map((make) => ({ key: `make:${make}`, label: make })),
    ...params.segments.map((value) => ({ key: `segment:${value}`, label: t(`attr.segment.${value}`) })),
    ...params.bodyTypes.map((value) => ({ key: `body:${value}`, label: t(`attr.body.${value}`) })),
    ...params.fuelTypes.map((value) => ({ key: `fuel:${value}`, label: t(`attr.fuel.${value}`) })),
  ];
  if (params.transmission) {
    activeItems.push({
      key: "gear",
      label: t(params.transmission === "manual" ? "filters.transmissionManual" : "filters.transmissionAutomatic"),
    });
  }
  if (params.priceMin !== undefined) {
    activeItems.push({ key: "pmin", label: t("filters.activePriceMin", { price: formatPln(params.priceMin, locale) }) });
  }
  if (params.priceMax !== undefined) {
    activeItems.push({ key: "pmax", label: t("filters.activePriceMax", { price: formatPln(params.priceMax, locale) }) });
  }
  if (params.query) activeItems.push({ key: "q", label: t("filters.activeQuery", { query: params.query }) });

  const methodologyLink = (
    <Link href={methodologyHref} className={linkClass}>
      {t("common.howWeCount")}
    </Link>
  );

  return (
    <>
      <ResultsFocus signature={toSearchParams(raw).toString()} />
      <MetricSelectorControl
        className="mt-6"
        current={metric}
        label={t("rankings.metricLabel")}
        metrics={RANKING_METRICS.map((key) => ({
          key,
          label: t(`metrics.${key}.label`),
          href: rankingsHref({ metric: key, selection: params, extra: carry }),
        }))}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        <aside aria-label={t("filters.title")} className="hidden lg:block">
          <div className={`${panelClass} p-5`}>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink">{t("filters.title")}</h2>
            <RankingFilters idPrefix="side" options={options} />
          </div>
        </aside>

        <section aria-labelledby="ranking-title" className="min-w-0">
          <AssumptionsSummary
            label={t("assumptions.title")}
            summary={assumptionsSummary(t, locale, assumptions)}
            action={
              <SheetDisclosure
                triggerLabel={t("assumptions.change")}
                triggerSize="sm"
                title={t("assumptions.title")}
                closeLabel={t("common.close")}
                applyLabel={t("assumptions.done")}
              >
                <AssumptionsControls idPrefix="sheet-a" />
              </SheetDisclosure>
            }
          />

          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div>
              <h2 id={RESULTS_HEADING_ID} tabIndex={-1} className={h2Class}>
                {title}
              </h2>
              <p className="mt-0.5 text-sm text-ink-muted" aria-live="polite">
                {carsText(ranked.length)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SheetDisclosure
                className="lg:hidden"
                triggerLabel={t("filters.title")}
                triggerIcon="sliders"
                badge={activeCount > 0 ? String(activeCount) : undefined}
                title={t("filters.title")}
                closeLabel={t("common.close")}
                applyLabel={t("filters.apply", { count: ranked.length })}
              >
                <RankingFilters idPrefix="sheet-f" options={options} />
              </SheetDisclosure>
              {!isPeriodIndependent(metric) && <PeriodSwitch />}
            </div>
          </div>

          <ActiveFiltersControl className="mt-4" items={activeItems} />

          <div className="mt-4">
            {ranked.length === 0 ? (
              <EmptyState
                title={t("rankings.emptyTitle")}
                headingLevel="h3"
                actions={
                  <ResultsLink href={rankingsHref({ metric, extra: carry })} focus="heading">
                    {t("filters.clear")}
                  </ResultsLink>
                }
              >
                <p>{t("rankings.emptyText")}</p>
              </EmptyState>
            ) : (
              <>
                <RankingList label={title}>
                  {visible.map((item) => (
                    <RankingRow
                      key={item.car.slug}
                      ranked={item}
                      metric={metric}
                      period={period}
                      maxAmount={maxAmount}
                      electricOnly={electricOnly}
                      locale={locale}
                      t={t}
                      carry={carryQuery}
                      withToggle
                    />
                  ))}
                </RankingList>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                  <p className="text-sm text-ink-muted">
                    {t("rankings.showing", {
                      shown: formatInteger(visible.length, locale),
                      total: formatInteger(ranked.length, locale),
                    })}
                  </p>
                  {visible.length < ranked.length && (
                    <ResultsLink
                      replace
                      focus="new-rows"
                      href={rankingsHref({
                        metric,
                        limit: limit + PAGE_SIZE,
                        selection: params,
                        extra: carry,
                      })}
                    >
                      {t("rankings.showMore")}
                    </ResultsLink>
                  )}
                </div>
                <div className="mt-6 space-y-3">
                  {metric === "fuelConsumption" && (
                    <InfoNote>
                      {electricOnly ? t("rankings.consumptionNoteElectric") : t("rankings.consumptionNote")}
                    </InfoNote>
                  )}
                  <PowerNote fuelTypes={visible.map((item) => item.car.fuelType)} />
                  {isPeriodIndependent(metric) ? (
                    <InfoNote>
                      {t("rankings.priceNote")} {methodologyLink}
                    </InfoNote>
                  ) : (
                    <EstimateNote>
                      {t("rankings.estimateNote")} {methodologyLink}
                    </EstimateNote>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
