import { getLocale, getTranslations } from "next-intl/server";
import { RankingListSkeleton } from "@/components/ui/Feedback";
import { EstimateNote } from "@/components/ui/Markers";
import { RankingList } from "@/components/ui/RankingItem";
import { h2Class, linkClass } from "@/components/ui/styles";
import { rankCars, type RankedCar, type RankingMetric } from "@/lib/costs";
import { getCatalog } from "@/lib/data/catalog";
import { parseAssumptions } from "@/lib/domain/assumptions";
import { formatInteger, type Locale } from "@/lib/format";
import type { RawParams } from "@/lib/state/assumption-params";
import { PowerNote } from "../car/PowerNote";
import { ListError } from "../ListError";
import { LiveLink } from "../LiveLink";
import { RANKING_METRICS } from "../rankings/params";
import { metricAmount, RankingRow } from "../rankings/RankingRow";
import { RankingLinks } from "./RankingLinks";

const TOP_COUNT = 5;
const listLinkClass = `${linkClass} inline-flex min-h-11 items-center font-semibold`;

/** Placeholder for the two lists while the assumptions of the URL are being read. */
export async function HomeListsFallback() {
  const t = await getTranslations("rankings");
  return (
    <div className="grid gap-x-8 gap-y-12 lg:grid-cols-2">
      <RankingListSkeleton rows={TOP_COUNT} label={t("loading")} />
      <RankingListSkeleton rows={TOP_COUNT} label={t("loading")} />
    </div>
  );
}

/** The two top-five lists, the links to all rankings and the note on estimates. */
export async function HomeLists({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const [catalog, t, locale] = await Promise.all([
    getCatalog().catch((): null => null),
    getTranslations(),
    getLocale() as Promise<Locale>,
  ]);

  const { assumptions, period } = parseAssumptions(raw);

  // A failing catalogue costs the two lists only: the rest of the page stays.
  const top = (metric: RankingMetric): RankedCar[] =>
    catalog ? rankCars(catalog.cars, catalog.prices, assumptions, metric, {}).slice(0, TOP_COUNT) : [];
  const byPrice = top("price");
  const byCost = top("totalCost");
  const largest = (items: RankedCar[], metric: RankingMetric) =>
    Math.max(0, ...items.map((item) => metricAmount(item, metric, period)));
  const maxPrice = largest(byPrice, "price");
  const maxCost = largest(byCost, "totalCost");

  const noteValues = {
    km: formatInteger(assumptions.annualMileageKm, locale),
    years: t("assumptions.yearsValue", { count: assumptions.ownershipYears }),
  };

  const row = (item: RankedCar, metric: RankingMetric, maxAmount: number) => (
    <RankingRow
      key={item.car.slug}
      ranked={item}
      metric={metric}
      period={period}
      maxAmount={maxAmount}
      electricOnly={false}
      locale={locale}
      t={t}
      withToggle={false}
      detail={false}
    />
  );

  const list = (items: RankedCar[], metric: RankingMetric, label: string, maxAmount: number) =>
    catalog ? (
      <RankingList label={label} className="mt-4">
        {items.map((item) => row(item, metric, maxAmount))}
      </RankingList>
    ) : (
      <ListError className="mt-4" />
    );

  return (
    <>
      <div className="grid gap-x-8 gap-y-12 lg:grid-cols-2">
        <section aria-label={t("home.topPriceTitle")}>
          <h2 className={h2Class}>
            {t("home.topPriceTitle")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t("metrics.price.description")}</p>
          {list(byPrice, "price", t("home.topPriceTitle"), maxPrice)}
          <p className="mt-3">
            <LiveLink to={{ kind: "carry", path: "/rankings", metric: "price" }} className={listLinkClass}>
              {t("home.topPriceLink")}
            </LiveLink>
          </p>
        </section>

        <section aria-label={t("home.topCostTitle")}>
          <h2 className={h2Class}>
            {t("home.topCostTitle")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t(period === "year" ? "home.topCostNoteYear" : "home.topCostNoteMonth", noteValues)}
          </p>
          {list(byCost, "totalCost", t("home.topCostTitle"), maxCost)}
          <p className="mt-3">
            <LiveLink to={{ kind: "carry", path: "/rankings" }} className={listLinkClass}>
              {t("home.topCostLink")}
            </LiveLink>
          </p>
        </section>
      </div>

      <section aria-label={t("home.allRankingsTitle")} className="mt-14">
        <h2 className={h2Class}>
          {t("home.allRankingsTitle")}
        </h2>
        <RankingLinks
          label={t("home.allRankingsTitle")}
          className="mt-4"
          items={RANKING_METRICS.map((metric) => ({
            metric,
            title: t(`metrics.${metric}.label`),
            description: t(`metrics.${metric}.description`),
          }))}
        />
      </section>

      <PowerNote
        className="mt-8"
        fuelTypes={[...byPrice, ...byCost].map((item) => item.car.fuelType)}
      />
      <EstimateNote className="mt-8">
        {t("home.estimateNote")}{" "}
        <LiveLink to={{ kind: "carry", path: "/methodology" }} className={linkClass}>
          {t("common.howWeCount")}
        </LiveLink>
      </EstimateNote>
    </>
  );
}
