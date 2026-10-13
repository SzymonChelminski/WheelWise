"use client";

import { useLocale, useTranslations } from "next-intl";
import { FiltersPanel, type FilterGroupKey, type FilterOption } from "@/components/ui/FiltersPanel";
import { formatInteger, type Locale } from "@/lib/format";
import { useIntendedEpoch, useIntendedQuery, useQueryWriter } from "@/lib/state/intended-query";
import { useDebouncedRun, useEpochDraft } from "../use-draft";
import { listValues, parseRankingParams, setListValues } from "./params";

export interface FilterOptionData {
  value: string;
  /** Cars in the catalogue behind this option; unknown while the catalogue cannot be read. */
  count?: number;
}

/** The options that exist in the catalogue; built on the server. */
export interface FilterOptions {
  body: FilterOptionData[];
  fuel: FilterOptionData[];
  segment: FilterOptionData[];
  make: FilterOptionData[];
}

const TEXT_PARAM = { query: "q", priceMin: "pmin", priceMax: "pmax" } as const;
type TextField = keyof typeof TEXT_PARAM;

/**
 * The filters of the rankings. They show the intended query and change it: a change is a
 * function of the query at that moment, so it keeps what other controls and links changed
 * before. Text fields wait until the user stops typing, or leaves the field.
 */
export function RankingFilters({ idPrefix, options }: { idPrefix: string; options: FilterOptions }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const intended = useIntendedQuery();
  const epoch = useIntendedEpoch();
  const write = useQueryWriter();
  // One timer per text field, so typing in one does not cancel a pending change in another.
  const debounce = {
    query: useDebouncedRun(400, epoch),
    priceMin: useDebouncedRun(400, epoch),
    priceMax: useDebouncedRun(400, epoch),
  };

  const selection = parseRankingParams(new URLSearchParams(intended));
  const intendedText = {
    query: selection.query,
    priceMin: selection.priceMin?.toString() ?? "",
    priceMax: selection.priceMax?.toString() ?? "",
  };
  const [query, setQuery] = useEpochDraft(intendedText.query, epoch);
  const [priceMin, setPriceMin] = useEpochDraft(intendedText.priceMin, epoch);
  const [priceMax, setPriceMax] = useEpochDraft(intendedText.priceMax, epoch);
  const drafts = { query, priceMin, priceMax };
  const setDraft = { query: setQuery, priceMin: setPriceMin, priceMax: setPriceMax };

  // A new filter starts the list from the top again.
  const changed = (mutate: (params: URLSearchParams) => void, writeOptions?: { typing?: boolean }) =>
    write((params) => {
      mutate(params);
      params.delete("limit");
    }, writeOptions);

  const chosen: Record<FilterGroupKey, readonly string[]> = {
    body: selection.bodyTypes,
    fuel: selection.fuelTypes,
    segment: selection.segments,
    make: selection.makes,
  };
  const isSelected = (group: FilterGroupKey, value: string): boolean =>
    chosen[group].some((item) => item.toLowerCase() === value.toLowerCase());

  // The group is the name of the query parameter.
  function onToggle(group: FilterGroupKey, value: string, checked: boolean) {
    changed((params) => {
      const others = listValues(params, group).filter((item) => item.toLowerCase() !== value.toLowerCase());
      setListValues(params, group, checked ? [...others, value] : others);
    });
  }

  function onTransmissionChange(value: string) {
    changed((params) => {
      if (value === "manual" || value === "automatic") params.set("gear", value);
      else params.delete("gear");
    });
  }

  function writeText(field: TextField, text: string) {
    changed(
      (params) => {
        const value = text.trim();
        if (value) params.set(TEXT_PARAM[field], value);
        else params.delete(TEXT_PARAM[field]);
      },
      { typing: true },
    );
  }

  function onTextChange(field: TextField, raw: string) {
    // Prices are whole numbers: anything else is dropped as it is typed.
    const value = field === "query" ? raw : raw.replace(/\D/g, "").slice(0, 9);
    setDraft[field](value);
    debounce[field].run(() => writeText(field, value));
  }

  // Leaving a text field writes what was typed without waiting.
  function onBlur(target: EventTarget) {
    if (!(target instanceof HTMLInputElement)) return;
    for (const field of Object.keys(TEXT_PARAM) as TextField[]) {
      if (target.id !== `${idPrefix}-${TEXT_PARAM[field]}`) continue;
      debounce[field].cancel();
      if (drafts[field].trim() !== intendedText[field]) writeText(field, drafts[field]);
    }
  }

  const option = (group: FilterGroupKey, data: FilterOptionData[], label: (value: string) => string): FilterOption[] =>
    data.map(({ value, count }) => ({
      value,
      label: label(value),
      count: count === undefined ? undefined : formatInteger(count, locale),
      selected: isSelected(group, value),
    }));

  const min = priceMin === "" ? undefined : Number(priceMin);
  const max = priceMax === "" ? undefined : Number(priceMax);

  return (
    <div className="contents" onBlur={(event) => onBlur(event.target)}>
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
    </div>
  );
}
