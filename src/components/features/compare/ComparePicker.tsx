"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
import type { Locale } from "@/lib/format";
import { carMeta, carName } from "../car/car-view";
import { createCarSearch } from "../search/car-search";
import { useSearchIndex } from "../shell/SearchIndexProvider";

const MAX_SUGGESTIONS = 8;

/** Search over the catalogue that adds the chosen car to the comparison instead of opening it. */
export function ComparePicker({
  selected,
  onAdd,
  className,
}: {
  /** Slugs already in the comparison; they are not offered again. */
  selected: readonly string[];
  onAdd: (slug: string) => void;
  className?: string;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const index = useSearchIndex();
  const [query, setQuery] = useState("");

  const search = useMemo(() => createCarSearch(index), [index]);
  const options = useMemo(
    () =>
      search(query, MAX_SUGGESTIONS + selected.length)
        .filter((entry) => !selected.includes(entry.slug))
        .slice(0, MAX_SUGGESTIONS)
        .map((entry) => ({
          id: entry.slug,
          href: `/cars/${entry.slug}`,
          title: carName(entry),
          meta: carMeta(t, locale, entry),
        })),
    [search, query, selected, t, locale],
  );

  return (
    <SearchCombobox
      labels={{
        label: t("search.label"),
        placeholder: t("search.placeholder"),
        clear: t("search.clear"),
        noResultsTitle: t("search.noResultsTitle"),
        noResultsHint: t("search.noResultsHint"),
        loading: t("search.loading"),
      }}
      options={options}
      query={query}
      onQueryChange={setQuery}
      onSelect={(option) => {
        onAdd(option.id);
        setQuery("");
      }}
      statusText={t("search.status", { count: options.length })}
      className={className}
    />
  );
}
