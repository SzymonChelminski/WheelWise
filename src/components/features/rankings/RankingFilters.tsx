"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useOptimistic } from "react";
import { FiltersPanel, type FilterGroupKey, type FilterOption } from "@/components/ui/FiltersPanel";
import { formatInteger, type Locale } from "@/lib/format";
import { useUrlWriter } from "@/lib/state/url-client";
import { useDebouncedRun, useSyncedDraft } from "../use-draft";
import { parseRankingParams, setListValues, type RankingSelection } from "./params";

export interface FilterOptionData {
  value: string;
  /** Cars in the catalogue behind this option. */
  count: number;
}

/** The options that exist in the catalogue; built on the server. */
export interface FilterOptions {
  body: FilterOptionData[];
  fuel: FilterOptionData[];
  segment: FilterOptionData[];
  make: FilterOptionData[];
}

const GROUP: Record<FilterGroupKey, { param: string; field: keyof RankingSelection }> = {
  body: { param: "body", field: "bodyTypes" },
  fuel: { param: "fuel", field: "fuelTypes" },
  segment: { param: "segment", field: "segments" },
  make: { param: "make", field: "makes" },
};

const TEXT_PARAM = { query: "q", priceMin: "pmin", priceMax: "pmax" } as const;

/**
 * The filters of the rankings. The state is the query string: a change replaces the URL,
 * the server renders the new list. Text fields wait until the user stops typing.
 */
export function RankingFilters({ idPrefix, options }: { idPrefix: string; options: FilterOptions }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const searchParams = useSearchParams();
  const { write } = useUrlWriter();
  // One timer per text field, so typing in one does not cancel a pending change in another.
  const debounce = {
    query: useDebouncedRun(),
    priceMin: useDebouncedRun(),
    priceMax: useDebouncedRun(),
  };

  const fromUrl = parseRankingParams(new URLSearchParams(searchParams));
  const [selection, patchSelection] = useOptimistic<RankingSelection, Partial<RankingSelection>>(
    fromUrl,
    (current, patch) => ({ ...current, ...patch }),
  );

  const [query, setQuery] = useSyncedDraft(fromUrl.query);
  const [priceMin, setPriceMin] = useSyncedDraft(fromUrl.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useSyncedDraft(fromUrl.priceMax?.toString() ?? "");

  const changed = (mutate: (params: URLSearchParams) => void, patch: Partial<RankingSelection>) =>
    write(
      (params) => {
        mutate(params);
        // A new filter starts the list from the top again.
        params.delete("limit");
      },
      () => patchSelection(patch),
    );

  const isSelected = (group: FilterGroupKey, value: string): boolean =>
    (selection[GROUP[group].field] as string[]).some((item) => item.toLowerCase() === value.toLowerCase());

  function onToggle(group: FilterGroupKey, value: string, checked: boolean) {
    const { param, field } = GROUP[group];
    const current = selection[field] as string[];
    const next = checked
      ? [...current, value]
      : current.filter((item) => item.toLowerCase() !== value.toLowerCase());
    changed((params) => setListValues(params, param, next), { [field]: next } as Partial<RankingSelection>);
  }

  function onTransmissionChange(value: string) {
    const transmission = value === "manual" || value === "automatic" ? value : undefined;
    changed(
      (params) => (transmission ? params.set("gear", transmission) : params.delete("gear")),
      { transmission },
    );
  }

  function onTextChange(field: keyof typeof TEXT_PARAM, raw: string) {
    // Prices are whole numbers: anything else is dropped as it is typed.
    const value = field === "query" ? raw : raw.replace(/\D/g, "").slice(0, 9);
    if (field === "query") setQuery(value);
    else if (field === "priceMin") setPriceMin(value);
    else setPriceMax(value);

    debounce[field].run(() =>
      changed(
        (params) => {
          const text = value.trim();
          if (text) params.set(TEXT_PARAM[field], text);
          else params.delete(TEXT_PARAM[field]);
        },
        {},
      ),
    );
  }

  const option = (group: FilterGroupKey, data: FilterOptionData[], label: (value: string) => string): FilterOption[] =>
    data.map(({ value, count }) => ({
      value,
      label: label(value),
      count: formatInteger(count, locale),
      selected: isSelected(group, value),
    }));

  const min = priceMin === "" ? undefined : Number(priceMin);
  const max = priceMax === "" ? undefined : Number(priceMax);

  return (
    <FiltersPanel
      idPrefix={idPrefix}
      labels={{
        query: t("filters.query"),
        queryPlaceholder: t("filters.queryPlaceholder"),
        price: t("filters.price"),
        priceMin: t("filters.priceMin"),
        priceMax: t("filters.priceMax"),
        priceUnit: t("filters.priceUnit"),
        body: t("filters.body"),
        fuel: t("filters.fuel"),
        transmission: t("filters.transmission"),
        transmissionAny: t("filters.transmissionAny"),
        transmissionManual: t("filters.transmissionManual"),
        transmissionAutomatic: t("filters.transmissionAutomatic"),
        segment: t("filters.segment"),
        make: t("filters.make"),
      }}
      query={query}
      priceMin={priceMin}
      priceMax={priceMax}
      priceError={min !== undefined && max !== undefined && min > max ? t("filters.priceError") : undefined}
      transmission={selection.transmission ?? ""}
      bodyTypes={option("body", options.body, (value) => t(`attr.body.${value}`))}
      fuelTypes={option("fuel", options.fuel, (value) => t(`attr.fuel.${value}`))}
      segments={option("segment", options.segment, (value) => t(`attr.segment.${value}`))}
      makes={option("make", options.make, (value) => value)}
      onTextChange={onTextChange}
      onTransmissionChange={onTransmissionChange}
      onToggle={onToggle}
    />
  );
}
