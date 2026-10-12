"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Header } from "@/components/layout/SiteShell";
import { usePathname } from "@/i18n/navigation";
import { pickAssumptionParams } from "@/lib/state/assumption-params";
import { useCompare } from "@/lib/state/compare-client";
import { headerLabels, mainNav } from "./nav";

/**
 * The designer's header, following the URL: the current page is marked, links keep
 * the assumption parameters, and the language switcher keeps path and query string.
 */
export function SiteHeader() {
  const t = useTranslations();
  const locale = useLocale() as "pl" | "en";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { slugs } = useCompare();

  const search = searchParams.toString();
  const query = pickAssumptionParams(new URLSearchParams(searchParams)).toString();

  return (
    <Header
      locale={locale}
      pathname={search ? `${pathname}?${search}` : pathname}
      nav={mainNav(t, { pathname, query, compareSlugs: slugs })}
      labels={headerLabels(t)}
    />
  );
}
