"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ClearFiltersButton } from "@/components/ui/FiltersPanel";
import { useIntendedQuery, useQueryWriter } from "@/lib/state/intended-query";
import { clearFilterParams, countActiveFilters, parseRankingParams } from "./params";

/**
 * "Clear filters" at the top of the filter panel (sidebar heading and filters sheet header).
 * It stays in place, and keeps keyboard focus, when nothing is left to clear; its own status
 * region announces the result. `makes` are the makes of the catalogue, spelled as there.
 */
export function ClearFiltersControl({ makes }: { makes: string[] }) {
  const t = useTranslations("filters");
  const write = useQueryWriter();
  const active = countActiveFilters(parseRankingParams(new URLSearchParams(useIntendedQuery()), makes)) > 0;
  const [cleared, setCleared] = useState(false);

  // A filter set again ends the announcement, so clearing once more is announced again.
  if (active && cleared) setCleared(false);

  return (
    <ClearFiltersButton
      label={t("clear")}
      active={active}
      status={cleared ? t("cleared") : ""}
      onClear={() => {
        setCleared(true);
        write(clearFilterParams);
      }}
    />
  );
}
