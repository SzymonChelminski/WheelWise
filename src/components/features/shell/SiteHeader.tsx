"use client";

import { useLocale, useTranslations } from "next-intl";
import { Header } from "@/components/layout/SiteShell";
import { usePathname } from "@/i18n/navigation";
import { pickAssumptionParams } from "@/lib/state/assumption-params";
import { useCompare } from "@/lib/state/compare-client";
import { useIntendedQuery } from "@/lib/state/intended-query";
import { headerLabels, mainNav } from "./nav";

/**
 * The page header, following the intended query: the current page is marked, links keep
 * the assumption parameters, and the language switcher keeps path and query string.
 */
export function SiteHeader() {
  const t = useTranslations();
  const locale = useLocale() as "pl" | "en";
  const pathname = usePathname();
  const intended = useIntendedQuery();
  const { slugs } = useCompare();

  const query = pickAssumptionParams(new URLSearchParams(intended)).toString();

  return (
    <Header
      locale={locale}
      pathname={intended ? `${pathname}?${intended}` : pathname}
      nav={mainNav(t, { pathname, query, compareSlugs: slugs })}
      labels={headerLabels(t)}
    />
  );
}
