"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import { CostBreakdown } from "@/components/ui/CostBreakdown";
import { EarningsScale } from "@/components/ui/EarningsScale";
import { Estimate, EstimateNote } from "@/components/ui/Markers";
import { h2Class, linkClass, panelClass } from "@/components/ui/styles";
import { calculateCosts } from "@/lib/costs";
import type { Car, MarketPrices } from "@/lib/domain/types";
import { formatPercent, formatPln, formatPlnExact, type Locale } from "@/lib/format";
import { useAssumptions } from "@/lib/state/assumptions-client";
import { AssumptionsSummaryControl } from "../assumptions/AssumptionsSummaryControl";
import { PeriodSwitch } from "../assumptions/PeriodSwitch";
import { LiveLink } from "../LiveLink";
import { breakdownItems, earningsLevels, periodMap } from "./car-format";

/*
 * The cost of owning one car, the breakdown and the earnings scale. Everything here is
 * calculated in the browser from the assumptions of the intended query, so a change of an
 * assumption or of the period is on the screen at once; the server renders the same for the
 * query of the request.
 */
export function CarCostSection({ car, prices }: { car: Car; prices: MarketPrices }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { assumptions, period } = useAssumptions();

  const costs = useMemo(() => calculateCosts(car, prices, assumptions), [car, prices, assumptions]);
  const map = periodMap(costs, period);
  const total = formatPln(map.total, locale);
  const periodText = period === "year" ? t("common.perYear") : t("common.perMonth");
  const years = t("assumptions.yearsValue", { count: assumptions.ownershipYears });

  const estimate = (chunks: ReactNode) => (
    <Estimate srLabel={t("common.estimateSr")} className="font-semibold text-ink">
      {chunks}
    </Estimate>
  );

  return (
    <>
      <section aria-labelledby="car-cost" className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h2 id="car-cost" className={h2Class}>
            {t("car.costTitle")}
          </h2>
          <PeriodSwitch />
        </div>

        <AssumptionsSummaryControl className="mt-4 lg:hidden" idPrefix="sheet-a" />

        <div className={`${panelClass} mt-4 p-4 md:p-6`}>
          <p className="font-display text-4xl font-semibold text-ink tabular-nums">
            <Estimate srLabel={t("common.estimateSr")}>{total}</Estimate>
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {t("car.costLead", { period: periodText, years })}
          </p>
          <CostBreakdown
            className="mt-6"
            animate
            items={breakdownItems(t, locale, costs, period)}
            total={total}
            labels={{
              caption: t("costs.caption", { period: periodText }),
              category: t("costs.category"),
              amount: t("costs.amount"),
              share: t("costs.share"),
              total: t("costs.total"),
              estimateSr: t("common.estimateSr"),
            }}
            footer={
              <>
                <p>
                  {t.rich("car.residual", {
                    years: t("assumptions.yearsAfter", { count: assumptions.ownershipYears }),
                    amount: formatPln(costs.residualValuePln, locale),
                    // The cost engine gives a percentage from 0 to 100; the formatter takes a share.
                    percent: formatPercent(costs.residualValuePct / 100, locale),
                    value: estimate,
                  })}
                </p>
                <p>
                  {t.rich("car.perKm", {
                    amount: formatPlnExact(costs.costPerKm, locale),
                    value: estimate,
                  })}
                </p>
              </>
            }
          />
        </div>
        <EstimateNote className="mt-3">
          {t("car.estimateNote")}{" "}
          <LiveLink to={{ kind: "carry", path: "/methodology" }} className={linkClass}>
            {t("common.howWeCount")}
          </LiveLink>
        </EstimateNote>
      </section>

      <section aria-labelledby="car-earnings" className="mt-12">
        <h2 id="car-earnings" className={h2Class}>
          {t("car.earningsTitle")}
        </h2>
        <p className="mt-2 max-w-prose text-base text-ink-muted">
          {t.rich(period === "year" ? "car.earningsIntroYear" : "car.earningsIntroMonth", {
            amount: total,
            value: estimate,
          })}
        </p>
        <EarningsScale
          className="mt-5"
          levels={earningsLevels(t, locale, costs.perMonth.total, period)}
        />
      </section>
    </>
  );
}
