import type { ReactNode } from "react";
import { COST_ORDER, type CostKey } from "@/components/ui/CostStrip";
import type { RankingItemProps } from "@/components/ui/RankingItem";
import type { CostMap, RankedCar, RankingMetric } from "@/lib/costs";
import type { Period } from "@/lib/domain/types";
import { formatDecimal, formatPln, type Locale } from "@/lib/format";
import { carMeta, carName, carNameWithAttributes, type Translate } from "../car/car-view";
import { CompareToggleButton } from "../compare/CompareToggleButton";
import { LiveRankingItem } from "./LiveRankingItem";

/** Metrics that do not depend on the cost period. */
export function isPeriodIndependent(metric: RankingMetric): boolean {
  return metric === "price" || metric === "fuelConsumption";
}

/** The field of the cost breakdown behind a cost metric. */
const COST_FIELD: Partial<Record<RankingMetric, keyof CostMap>> = {
  totalCost: "total",
  depreciation: "depreciation",
  maintenance: "maintenance",
  service: "service",
  parts: "parts",
  fuelCost: "fuel",
  insurance: "insurance",
};

/** Metrics shown as a strip with one category in colour. */
const EMPHASIS: Partial<Record<RankingMetric, CostKey>> = {
  depreciation: "depreciation",
  service: "service",
  parts: "parts",
  fuelCost: "fuel",
  insurance: "insurance",
};

/** The ranked amount for the chosen period. Price and consumption are the ranked value itself. */
export function metricAmount(ranked: RankedCar, metric: RankingMetric, period: Period): number {
  const field = COST_FIELD[metric];
  if (!field) return ranked.value;
  return (period === "year" ? ranked.costs.perYear : ranked.costs.perMonth)[field];
}

const MAINTENANCE_KEYS: readonly CostKey[] = ["service", "parts", "fees"];

/** Share of each category in the strip: of the total cost, or of the maintenance cost alone. */
function stripShares(ranked: RankedCar, metric: RankingMetric): Partial<Record<CostKey, number>> {
  const costs = ranked.costs.perMonth;
  const maintenance = metric === "maintenance";
  const whole = maintenance ? costs.maintenance : costs.total;
  const keys = maintenance ? MAINTENANCE_KEYS : COST_ORDER;
  return Object.fromEntries(keys.map((key) => [key, whole > 0 ? costs[key] / whole : 0]));
}

export function RankingRow({
  ranked,
  metric,
  period,
  maxAmount,
  electricOnly,
  locale,
  t,
  withToggle,
  detail = true,
}: {
  ranked: RankedCar;
  metric: RankingMetric;
  period: Period;
  /** Largest amount in the list: the longest bar. */
  maxAmount: number;
  /** The consumption ranking shows kWh/100 km instead of l/100 km. */
  electricOnly: boolean;
  locale: Locale;
  t: Translate;
  withToggle: boolean;
  /** Price line under the name; the home page leaves it out. */
  detail?: boolean;
}) {
  const { car } = ranked;
  const name = carName(car);
  const amount = metricAmount(ranked, metric, period);
  const ratio = maxAmount > 0 ? amount / maxAmount : 0;
  const indicativePrice = `${t("common.indicative")} ${formatPln(car.listPricePln, locale)}`;

  let value: string;
  let caption: string;
  let bar: RankingItemProps["bar"];
  if (metric === "price") {
    value = formatPln(amount, locale);
    caption = t("common.indicative");
    bar = { kind: "value", ratio };
  } else if (metric === "fuelConsumption") {
    const unit = electricOnly ? t("attr.consumptionElectric") : t("attr.consumptionFuel");
    value = `${formatDecimal(amount, locale)} ${unit}`;
    caption = t("rankings.consumptionCaption");
    bar = { kind: "value", ratio };
  } else {
    value = formatPln(amount, locale);
    caption = period === "year" ? t("common.perYear") : t("common.perMonth");
    bar = { kind: "strip", ratio, shares: stripShares(ranked, metric), emphasis: EMPHASIS[metric] };
  }

  let action: ReactNode;
  if (withToggle) {
    action = (
      <CompareToggleButton slug={car.slug} name={carNameWithAttributes(t, locale, car)} />
    );
  }

  return (
    <LiveRankingItem
      rank={ranked.rank}
      slug={car.slug}
      name={name}
      meta={carMeta(t, locale, car)}
      detail={metric !== "price" && detail ? indicativePrice : undefined}
      value={value}
      valueCaption={caption}
      estimate={bar.kind === "strip"}
      estimateSrLabel={t("common.estimateSr")}
      bar={bar}
      action={action}
    />
  );
}
