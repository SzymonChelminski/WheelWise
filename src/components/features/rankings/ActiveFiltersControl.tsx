"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { ActiveFilters } from "@/components/ui/FiltersPanel";
import { formatPln, type Locale } from "@/lib/format";
import { useIntendedQuery, useQueryWriter } from "@/lib/state/intended-query";
import { FILTER_PARAMS, listValues, parseRankingParams, setListValues } from "./params";
import { focusChipAfterUpdate, focusHeadingAfterUpdate, settleFocus } from "./results-focus";

interface ActiveFilterItem {
  /** "make:Audi", "fuel:ev", "gear", "pmin", "pmax" or "q". */
  key: string;
  label: string;
}

/**
 * The chips of the filters that are on, each removable, and "clear filters". They show the
 * intended query, so a chip is gone as soon as it is removed. `makes` are the makes of the
 * catalogue, spelled as there.
 */
export function ActiveFiltersControl({
  makes,
  className,
}: {
  makes: string[];
  className?: string;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const write = useQueryWriter();
  const intended = useIntendedQuery();

  useEffect(() => settleFocus("controls", intended), [intended]);

  const selection = parseRankingParams(new URLSearchParams(intended), makes);
  const items: ActiveFilterItem[] = [
    ...selection.makes.map((make) => ({ key: `make:${make}`, label: make })),
    ...selection.segments.map((value) => ({ key: `segment:${value}`, label: t(`attr.segment.${value}`) })),
    ...selection.bodyTypes.map((value) => ({ key: `body:${value}`, label: t(`attr.body.${value}`) })),
    ...selection.fuelTypes.map((value) => ({ key: `fuel:${value}`, label: t(`attr.fuel.${value}`) })),
  ];
  if (selection.transmission) {
    items.push({
      key: "gear",
      label: t(selection.transmission === "manual" ? "filters.transmissionManual" : "filters.transmissionAutomatic"),
    });
  }
  if (selection.priceMin !== undefined) {
    items.push({ key: "pmin", label: t("filters.activePriceMin", { price: formatPln(selection.priceMin, locale) }) });
  }
  if (selection.priceMax !== undefined) {
    items.push({ key: "pmax", label: t("filters.activePriceMax", { price: formatPln(selection.priceMax, locale) }) });
  }
  if (selection.query) items.push({ key: "q", label: t("filters.activeQuery", { query: selection.query }) });

  function remove(key: string) {
    focusChipAfterUpdate(items.findIndex((item) => item.key === key));
    const separator = key.indexOf(":");
    const param = separator < 0 ? key : key.slice(0, separator);
    const value = separator < 0 ? undefined : key.slice(separator + 1);
    write((params) => {
      if (value === undefined) params.delete(param);
      else {
        setListValues(
          params,
          param,
          listValues(params, param).filter((item) => item.toLowerCase() !== value.toLowerCase()),
        );
      }
      params.delete("limit");
    });
  }

  function clear() {
    focusHeadingAfterUpdate();
    write((params) => {
      for (const param of FILTER_PARAMS) params.delete(param);
      params.delete("limit");
    });
  }

  return (
    <div data-active-filters className="contents">
      <ActiveFilters
        className={className}
        items={items}
        labels={{ list: t("filters.activeList"), remove: t("filters.remove"), clear: t("filters.clear") }}
        onRemove={remove}
        onClear={clear}
      />
    </div>
  );
}
