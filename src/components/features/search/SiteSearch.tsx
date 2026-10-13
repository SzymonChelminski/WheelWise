"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/lib/format";
import { pickAssumptionParams, withQuery } from "@/lib/state/assumption-params";
import { readIntendedQuery } from "@/lib/state/intended-query";
import { carMeta, carName } from "../car/car-view";
import { useSearchIndex } from "../shell/SearchIndexProvider";
import { createCarSearch } from "./car-search";

const MAX_SUGGESTIONS = 8;

/**
 * Car search over the catalogue index. Choosing a suggestion opens the car; Enter
 * without a choice opens the rankings filtered by the typed text. Both keep the
 * assumption parameters of the current page.
 */
export function SiteSearch({ size, className }: { size?: "md" | "lg"; className?: string }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const index = useSearchIndex();
  const [query, setQuery] = useState("");

  const search = useMemo(() => createCarSearch(index), [index]);
  const options = useMemo(
    () =>
      search(query, MAX_SUGGESTIONS).map((entry) => ({
        id: entry.slug,
        href: `/cars/${entry.slug}`,
        title: carName(entry),
        meta: carMeta(t, locale, entry),
      })),
    [search, query, t, locale],
  );

  // Read when the user acts, so no component has to follow the query string.
  const carried = () => pickAssumptionParams(new URLSearchParams(readIntendedQuery()));

  return (
    <form
      role="search"
      // Without JavaScript the browser sends the typed text to the rankings.
      action={`/${locale}/rankings`}
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        const text = query.trim();
        if (!text) return;
        router.push(withQuery("/rankings", new URLSearchParams({ q: text }), carried()));
      }}
    >
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
          router.push(withQuery(option.href, carried()));
        }}
        statusText={t("search.status", { count: options.length })}
        size={size}
        className={className}
      />
    </form>
  );
}
