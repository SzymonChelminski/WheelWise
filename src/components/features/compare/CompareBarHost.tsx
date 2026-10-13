"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { CompareBar, type CompareBarCar } from "@/components/ui/CompareBar";
import { usePathname } from "@/i18n/navigation";
import type { Locale } from "@/lib/format";
import { pickAssumptionParams } from "@/lib/state/assumption-params";
import { useCompare } from "@/lib/state/compare-client";
import { useIntendedQuery } from "@/lib/state/intended-query";
import { carMeta, carName } from "../car/car-view";
import { compareHref as buildCompareHref } from "../shell/nav";
import { useSearchIndex } from "../shell/SearchIndexProvider";

// The room the design reserves before the bar has been measured.
const CLOSED_HEIGHT_FALLBACK = "6.5rem";

/*
 * The comparison bar wired to the stored selection. It is mounted on every page,
 * also while nothing is selected: the bar itself renders nothing then, but it must
 * be there to move keyboard focus to the main content when the last car is removed.
 */
export function CompareBarHost() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const intended = useIntendedQuery();
  const index = useSearchIndex();
  const { slugs, remove, clear, limitReached, dismissLimitNotice } = useCompare();

  const known = useMemo(() => new Map(index.map((entry) => [entry.slug, entry])), [index]);
  const cars: CompareBarCar[] = [];
  for (const slug of slugs) {
    const entry = known.get(slug);
    if (entry) cars.push({ slug, name: carName(entry), meta: carMeta(t, locale, entry) });
  }

  // A car that left the catalogue cannot be compared any more.
  useEffect(() => {
    if (known.size === 0) return;
    for (const slug of slugs) if (!known.has(slug)) remove(slug);
  }, [known, slugs, remove]);

  // The limit message belongs to the page it appeared on.
  useEffect(() => {
    dismissLimitNotice();
  }, [pathname, dismissLimitNotice]);

  const count = cars.length;

  // The room under the footer is the height of the closed bar, also while the bar is open: the open
  // bar closes as soon as a pointer goes down outside it, and room that shrank with it would move
  // the page under that pointer. The bar publishes --bar-height only while it is closed and leaves
  // the value behind when it empties. So this only drops the value when the bar is gone (the page's
  // own default applies) and, when the bar comes back already open and has published nothing,
  // brings back the closed height it had last (or the design's fallback).
  const closedHeight = useRef<string>(CLOSED_HEIGHT_FALLBACK);
  useEffect(() => {
    const style = document.documentElement.style;
    const published = style.getPropertyValue("--bar-height");
    if (count === 0) {
      if (published) closedHeight.current = published;
      style.removeProperty("--bar-height");
    } else if (!published) {
      style.setProperty("--bar-height", closedHeight.current);
    }
  }, [count]);

  const compareHref = buildCompareHref({
    pathname,
    query: pickAssumptionParams(new URLSearchParams(intended)).toString(),
    compareSlugs: cars.map((car) => car.slug),
  });

  return (
    <CompareBar
      cars={cars}
      compareHref={compareHref}
      notice={limitReached ? t("compareBar.limit") : undefined}
      onRemove={remove}
      onClear={clear}
      labels={{
        region: t("compareBar.region"),
        toggle: t("compareBar.toggle", { count }),
        list: t("compareBar.list"),
        count: t("compareBar.count", { count }),
        compare: t("compareBar.compare", { count }),
        compareIdle: t("compareBar.compareIdle"),
        needMore: t("compareBar.needMore"),
        empty: t("compareBar.empty"),
        full: t("compareBar.full"),
        remove: t("compareBar.remove"),
        clear: t("compareBar.clear"),
      }}
    />
  );
}
