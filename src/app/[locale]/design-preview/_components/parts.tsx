import { AssumptionsPanel, type AssumptionValues } from "@/components/ui/AssumptionsPanel";
import { COMPARE_BAR_HINT_ID } from "@/components/ui/CompareBar";
import { CompareToggle } from "@/components/ui/CompareToggle";
import { FiltersPanel } from "@/components/ui/FiltersPanel";
import { formatDecimal, formatInteger, formatPln, type Locale } from "@/components/ui/format";
import { RankingItem } from "@/components/ui/RankingItem";
import { mockAssumptions, mockFilterCounts, mockMakes } from "@/mocks/cars";
import { copy } from "@/mocks/copy";
import type { RankedCar } from "@/mocks/types";
import { carMeta, carName, ownershipText, P, searchOptions, shares } from "../_lib/view";
import { SearchDemo } from "./SearchDemo";

/* Small compositions shared by the preview pages. */

export function PreviewSearch({
  locale,
  ...rest
}: { locale: Locale } & Omit<
  Parameters<typeof SearchDemo>[0],
  "labels" | "options" | "statusTexts"
>) {
  const t = copy[locale].search;
  const options = searchOptions(locale);
  return (
    <SearchDemo
      labels={{
        label: t.label,
        placeholder: t.placeholder,
        clear: t.clear,
        noResultsTitle: t.noResultsTitle,
        noResultsHint: t.noResultsHint,
        loading: t.loading,
      }}
      options={options}
      statusTexts={Array.from({ length: options.length + 1 }, (_, n) => t.status(n))}
      {...rest}
    />
  );
}

export function PriceRow({
  item,
  locale,
  max,
}: {
  item: RankedCar;
  locale: Locale;
  max: number;
}) {
  const t = copy[locale];
  return (
    <RankingItem
      rank={item.rank}
      href={`${P}/car`}
      name={carName(item.car)}
      meta={carMeta(item.car, locale)}
      value={formatPln(item.value, locale)}
      valueCaption={t.common.indicative}
      bar={{ kind: "value", ratio: item.value / max }}
    />
  );
}

export function CostRow({
  item,
  locale,
  max,
  compare,
  detail = true,
  demo,
}: {
  /** false on the home page: the row stays as short as a price row. */
  detail?: boolean;
  item: RankedCar;
  locale: Locale;
  /** Largest value in the list: the longest bar. */
  max: number;
  /** undefined = no toggle; otherwise its state. */
  compare?: "off" | "on" | "full";
  demo?: "hover" | "focus";
}) {
  const t = copy[locale];
  const name = carName(item.car);
  return (
    <RankingItem
      rank={item.rank}
      href={`${P}/car`}
      name={name}
      meta={carMeta(item.car, locale)}
      detail={
        detail ? `${t.common.indicative} ${formatPln(item.car.listPricePln, locale)}` : undefined
      }
      value={formatPln(item.value, locale)}
      valueCaption={t.common.perMonth}
      estimate
      estimateSrLabel={t.common.estimateSr}
      bar={{ kind: "strip", ratio: item.value / max, shares: shares(item.costs) }}
      demo={demo}
      action={
        compare && (
          <CompareToggle
            pressed={compare === "on"}
            full={compare === "full"}
            describedBy={COMPARE_BAR_HINT_ID}
            carName={name}
            labels={t.compareToggle}
          />
        )
      }
    />
  );
}

/** Row of the fuel-consumption ranking: WLTP figure, single-value bar, no "≈". */
export function ConsumptionRow({
  item,
  locale,
  max,
  compare,
}: {
  item: RankedCar;
  locale: Locale;
  max: number;
  compare?: "off" | "on" | "full";
}) {
  const t = copy[locale];
  const name = carName(item.car);
  return (
    <RankingItem
      rank={item.rank}
      href={`${P}/car`}
      name={name}
      meta={carMeta(item.car, locale)}
      detail={`${t.common.indicative} ${formatPln(item.car.listPricePln, locale)}`}
      value={`${formatDecimal(item.value, locale)} ${t.attr.consumptionFuel}`}
      valueCaption={t.rankings.consumptionCaption}
      bar={{ kind: "value", ratio: item.value / max }}
      action={
        compare && (
          <CompareToggle
            pressed={compare === "on"}
            full={compare === "full"}
            describedBy={COMPARE_BAR_HINT_ID}
            carName={name}
            labels={t.compareToggle}
          />
        )
      }
    />
  );
}

export function assumptionValues(overrides: Partial<AssumptionValues> = {}): AssumptionValues {
  return {
    annualMileageKm: String(mockAssumptions.annualMileageKm),
    ownershipYears: String(mockAssumptions.ownershipYears),
    insuranceMode: "estimate",
    driverAgeBand: "35-44",
    coverage: "oc_ac",
    annualPremiumPln: "2400",
    ...overrides,
  };
}

export function PreviewAssumptions({
  locale,
  idPrefix,
  values,
  errors,
}: {
  locale: Locale;
  idPrefix: string;
  values?: Partial<AssumptionValues>;
  errors?: Parameters<typeof AssumptionsPanel>[0]["errors"];
}) {
  const t = copy[locale].assumptions;
  return (
    <AssumptionsPanel
      idPrefix={idPrefix}
      values={assumptionValues(values)}
      errors={errors}
      labels={{
        ...t,
        ageBandOptions: Object.entries(t.ageBands).map(([value, label]) => ({ value, label })),
      }}
    />
  );
}

export function assumptionsSummary(locale: Locale): string {
  const t = copy[locale].assumptions;
  return t.summary(formatInteger(mockAssumptions.annualMileageKm, locale), ownershipText(mockAssumptions.ownershipYears, locale));
}

export function PreviewFilters({ locale, idPrefix }: { locale: Locale; idPrefix: string }) {
  const t = copy[locale];
  // Kept in step with the cars of the mock ranking: segments A to D, up to 200 000 zł.
  const selectedSegments = ["A", "B", "C", "D"];
  return (
    <FiltersPanel
      idPrefix={idPrefix}
      labels={t.filters}
      priceMax="200000"
      bodyTypes={Object.entries(t.attr.body).map(([value, label]) => ({
        value,
        label,
        count: String(mockFilterCounts.body[value as keyof typeof mockFilterCounts.body]),
      }))}
      fuelTypes={Object.entries(t.attr.fuel).map(([value, label]) => ({
        value,
        label,
        count: value === "lpg" ? "0" : String(mockFilterCounts.fuel[value as keyof typeof mockFilterCounts.fuel]),
        disabled: value === "lpg",
      }))}
      segments={Object.entries(t.attr.segment).map(([value, label]) => ({
        value,
        label,
        count: String(mockFilterCounts.segment[value as keyof typeof mockFilterCounts.segment]),
        selected: selectedSegments.includes(value),
      }))}
      makes={mockMakes.map((make) => ({
        value: make.name,
        label: make.name,
        count: String(make.count),
      }))}
    />
  );
}

export function activeFilterItems(locale: Locale) {
  const t = copy[locale];
  return [
    { key: "pmax", label: `${t.filters.priceMax.toLowerCase()} ${formatPln(200000, locale)}` },
    { key: "seg-a", label: t.attr.segment.A },
    { key: "seg-b", label: t.attr.segment.B },
    { key: "seg-c", label: t.attr.segment.C },
    { key: "seg-d", label: t.attr.segment.D },
  ];
}
