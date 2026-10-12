"use client";

import { useTranslations } from "next-intl";
import { ActiveFilters } from "@/components/ui/FiltersPanel";
import { useUrlWriter } from "@/lib/state/url-client";
import { FILTER_PARAMS, listValues, setListValues } from "./params";

export interface ActiveFilterItem {
  /** "make:Audi", "fuel:ev", "gear", "pmin", "pmax" or "q". */
  key: string;
  label: string;
}

/** The chips of the filters that are on, each removable, and "clear filters". */
export function ActiveFiltersControl({
  items,
  className,
}: {
  items: ActiveFilterItem[];
  className?: string;
}) {
  const t = useTranslations("filters");
  const { write } = useUrlWriter();

  function remove(key: string) {
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
    write((params) => {
      for (const param of FILTER_PARAMS) params.delete(param);
      params.delete("limit");
    });
  }

  return (
    <ActiveFilters
      className={className}
      items={items}
      labels={{ list: t("activeList"), remove: t("remove"), clear: t("clear") }}
      onRemove={remove}
      onClear={clear}
    />
  );
}
