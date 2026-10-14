"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { buttonClass } from "@/components/ui/Button";
import { ComparisonTable, type ComparisonRow } from "@/components/ui/ComparisonTable";
import { ComparisonSkeleton, EmptyState } from "@/components/ui/Feedback";
import { EstimateNote, InfoNote } from "@/components/ui/Markers";
import { h1Class, h3Class, linkClass } from "@/components/ui/styles";
import { calculateCosts } from "@/lib/costs";
import type { Car, MarketPrices } from "@/lib/domain/types";
import { formatDate, formatPln, type Locale } from "@/lib/format";
import { useAssumptions } from "@/lib/state/assumptions-client";
import { useCompare } from "@/lib/state/compare-client";
import { useIntendedQuery, useQueryWriter } from "@/lib/state/intended-query";
import { rendered } from "../rankings/results-focus";
import { AssumptionsSummaryControl } from "../assumptions/AssumptionsSummaryControl";
import { PeriodSwitch } from "../assumptions/PeriodSwitch";
import { carMeta } from "../car/car-view";
import { consumptionText, costShares, periodMap, powerNotes, powerValue } from "../car/car-format";
import { LiveLink } from "../LiveLink";
import { resolveTarget } from "../link-target";
import { useSearchIndex } from "../shell/SearchIndexProvider";
import { COMPARE_PARAM, MAX_COMPARED, compareCandidates, pickCompared } from "./compare-slugs";
import { ComparePicker } from "./ComparePicker";

const COST_ROWS = ["depreciation", "fuel", "insurance", "service", "parts", "fees"] as const;

/** Index of the single smallest value, or null when the smallest is shared. */
function lowest(values: number[]): number | null {
  const min = Math.min(...values);
  return values.filter((value) => value === min).length === 1 ? values.indexOf(min) : null;
}

/** Index of the single largest value, or null when the largest is shared. */
function highest(values: number[]): number | null {
  return lowest(values.map((value) => -value));
}

/** Values as the page prints them, so two amounts that look the same never get a "best" mark. */
const rounded = (values: number[]) => values.map((value) => Math.round(value));

/*
 * The comparison page. The cars come from the `cars` parameter of the intended query (a page
 * opened without it takes the stored selection of two or more cars) and the costs are
 * calculated here from the intended assumptions, so removing a car or changing an assumption
 * shows at once. `cars` holds the data of the cars the server rendered the page for; a car
 * that was only just added appears as soon as the server has sent it.
 */
export function CompareView({ cars, prices }: { cars: Car[]; prices: MarketPrices }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const intended = useIntendedQuery();
  const write = useQueryWriter();
  const index = useSearchIndex();
  const { slugs: stored, clear, add } = useCompare();
  const { assumptions, period } = useAssumptions();

  const dataBySlug = useMemo(() => new Map(cars.map((car) => [car.slug, car])), [cars]);
  const isCar = useMemo(() => {
    const known = new Set(index.map((entry) => entry.slug));
    return (slug: string) => known.has(slug) || dataBySlug.has(slug);
  }, [index, dataBySlug]);

  const hasParam = new URLSearchParams(intended).has(COMPARE_PARAM);
  const storedCars = pickCompared(stored, isCar);
  const storedKey = storedCars.join(",");
  const selected = hasParam
    ? pickCompared(compareCandidates(new URLSearchParams(intended).get(COMPARE_PARAM)), isCar)
    : storedCars;

  // A page opened without cars takes the stored selection, when it is enough to compare.
  const restoring = !hasParam && storedCars.length >= 2;
  useEffect(() => {
    if (!restoring) return;
    write((params) => {
      if (!params.has(COMPARE_PARAM)) params.set(COMPARE_PARAM, storedKey);
    });
  }, [restoring, storedKey, write]);

  /**
   * Changes the list of cars as the intended query has it at that moment, and makes the stored
   * selection (the comparison bar) the same as the page.
   */
  function change(update: (current: string[]) => string[]) {
    const next = write((params) => {
      const current = params.has(COMPARE_PARAM)
        ? pickCompared(compareCandidates(params.get(COMPARE_PARAM)), isCar)
        : storedCars;
      const updated = update(current);
      if (updated.length > 0) params.set(COMPARE_PARAM, updated.join(","));
      else params.delete(COMPARE_PARAM);
    });
    const list = pickCompared(compareCandidates(new URLSearchParams(next).get(COMPARE_PARAM)), isCar);
    if (list.join(",") === stored.join(",")) return;
    clear();
    for (const slug of list) add(slug);
  }
  const shown = selected.flatMap((slug) => dataBySlug.get(slug) ?? []);

  // The control that had focus leaves the page with its car (the remove button) or its place
  // (the search field), so focus is handed on once the page shows the result.
  const focusPending = useRef<{ ready: (slugs: string[]) => boolean; target: () => HTMLElement | null } | null>(
    null,
  );
  useEffect(() => {
    const pending = focusPending.current;
    if (!pending || !pending.ready(shown.map((car) => car.slug))) return;
    focusPending.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    pending.target()?.focus();
  });

  const remove = (slug: string) => {
    const position = selected.indexOf(slug);
    focusPending.current = {
      ready: (slugs) => !slugs.includes(slug),
      // The remove button of the car that took the place, or of the last car; the heading when the table is gone.
      target: () => {
        const buttons = rendered(`main button[aria-label^="${t("compare.remove")}"]`);
        return buttons.length > 0 ? buttons[Math.min(position, buttons.length - 1)] : rendered("main h1")[0] ?? null;
      },
    };
    change((current) => current.filter((item) => item !== slug));
  };
  const addCar = (slug: string) => {
    focusPending.current = {
      ready: (slugs) => slugs.length >= 2 && slugs.includes(slug),
      target: () => rendered(`main a[href*="/cars/${slug}"]`)[0] ?? null,
    };
    change((current) =>
      current.includes(slug) || current.length >= MAX_COMPARED ? current : [...current, slug],
    );
  };

  const heading = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <h1 tabIndex={-1} className={h1Class}>
        {t("compare.title")}
      </h1>
      {selected.length >= 2 && <PeriodSwitch />}
    </div>
  );

  if (selected.length < 2) {
    return (
      <>
        {heading}
        <EmptyState
          className="mt-6"
          title={selected.length === 1 ? t("compare.emptyOneTitle") : t("compare.emptyTitle")}
          actions={
            <LiveLink
              to={{ kind: "carry", path: "/rankings" }}
              className={buttonClass({ variant: "secondary" })}
            >
              {t("compare.toRankings")}
            </LiveLink>
          }
        >
          <p>{t("compare.emptyText")}</p>
          <ComparePicker className="mt-5 max-w-md" selected={selected} onAdd={addCar} />
        </EmptyState>
      </>
    );
  }

  // Cars were chosen and the server has not sent their data yet.
  if (shown.length < 2) {
    return (
      <>
        {heading}
        <AssumptionsSummaryControl className="mt-6" />
        <div className="mt-4">
          <ComparisonSkeleton columns={selected.length === 3 ? 3 : 2} label={t("compare.loading")} />
        </div>
      </>
    );
  }

  const costs = shown.map((car) => calculateCosts(car, prices, assumptions));
  const maps = costs.map((item) => periodMap(item, period));
  const periodText = period === "year" ? t("common.perYear") : t("common.perMonth");
  const afterYears = t("assumptions.yearsAfter", { count: assumptions.ownershipYears });

  const costRow = (
    key: (typeof COST_ROWS)[number] | "total",
    extra: Partial<ComparisonRow> = {},
  ): ComparisonRow => ({
    key,
    label: t(`costs.${key}`),
    values: maps.map((map) => formatPln(map[key], locale)),
    best: lowest(rounded(maps.map((map) => map[key]))),
    bestLabel: t("compare.lowest"),
    estimate: true,
    ...extra,
  });

  // Litres and kilowatt-hours cannot be ranked against each other, and a plug-in hybrid has both.
  const sameUnit = new Set(shown.map((car) => car.fuelL100 !== null)).size === 1;
  const hasPhev = shown.some((car) => car.fuelType === "phev");
  const consumption = shown.map((car) => (car.fuelL100 ?? car.electricKwh100 ?? 0) * 10);
  const powerNote = shown.map((car) => powerNotes(t, car));

  const rows: ComparisonRow[] = [
    {
      key: "price",
      label: t("compare.price"),
      values: shown.map((car) => formatPln(car.listPricePln, locale)),
      best: lowest(shown.map((car) => car.listPricePln)),
      bestLabel: t("compare.lowest"),
      notes: shown.map((car) => t("compare.priceDate", { date: formatDate(car.priceObservedAt, locale) })),
    },
    costRow("depreciation", { groupStart: true }),
    ...COST_ROWS.slice(1).map((key) => costRow(key)),
    costRow("total", { emphasis: true }),
    {
      key: "residual",
      label: t("compare.residual", { years: afterYears }),
      values: costs.map((item) => formatPln(item.residualValuePln, locale)),
      best: highest(rounded(costs.map((item) => item.residualValuePln))),
      bestLabel: t("compare.highest"),
      estimate: true,
      groupStart: true,
    },
    {
      key: "consumption",
      label: t("compare.consumption"),
      values: shown.map((car) => consumptionText(t, locale, car)),
      best: sameUnit && !hasPhev ? lowest(rounded(consumption)) : null,
      bestLabel: t("compare.lowest"),
    },
    {
      key: "power",
      label: t("compare.power"),
      values: shown.map((car) => powerValue(t, locale, car)),
      notes: powerNote.map((note) => note?.row ?? null),
      best: null,
      bestLabel: "",
    },
  ];

  return (
    <>
      {heading}
      <AssumptionsSummaryControl className="mt-6" />

      <ComparisonTable
        className="mt-4"
        cars={shown.map((car, position) => ({
          slug: car.slug,
          href: resolveTarget({ kind: "carry", path: `/cars/${car.slug}` }, intended),
          make: car.make,
          variant: car.variant,
          meta: carMeta(t, locale, car),
          shares: costShares(costs[position]),
        }))}
        rows={rows}
        onRemove={remove}
        labels={{
          caption: t("compare.caption", { period: periodText }),
          rowHeader: t("compare.rowHeader"),
          remove: t("compare.remove"),
          removeShort: t("compare.removeShort"),
          estimateSr: t("common.estimateSr"),
          cars: t("compare.cars"),
        }}
        footer={
          powerNote.some(Boolean) && (
            <InfoNote>
              {t("power.listNote")}{" "}
              <LiveLink
                to={{ kind: "carry", path: `/methodology#${t("power.methodologyAnchor")}` }}
                className={linkClass}
              >
                {t("power.methodologyLink")}
              </LiveLink>
            </InfoNote>
          )
        }
      />

      <EstimateNote className="mt-4">
        {t("rankings.estimateNote")}{" "}
        <LiveLink to={{ kind: "carry", path: "/methodology" }} className={linkClass}>
          {t("common.howWeCount")}
        </LiveLink>
      </EstimateNote>

      {selected.length === 2 && (
        <section aria-label={t("compare.addThirdTitle")} className="mt-10 max-w-md">
          <h2 className={h3Class}>
            {t("compare.addThirdTitle")}
          </h2>
          <ComparePicker className="mt-3" selected={selected} onAdd={addCar} />
        </section>
      )}
    </>
  );
}
