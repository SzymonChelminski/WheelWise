"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { CompareBar, type CompareBarCar } from "@/components/ui/CompareBar";
import { usePathname } from "@/i18n/navigation";
import type { Locale } from "@/lib/format";
import { pickAssumptionParams } from "@/lib/state/assumption-params";
import { useCompare } from "@/lib/state/compare-client";
import { carMeta, carName } from "../car/car-view";
import { compareHref as buildCompareHref } from "../shell/nav";
import { useSearchIndex } from "../shell/SearchIndexProvider";

/*
 * The comparison bar wired to the stored selection. It is mounted on every page,
 * also while nothing is selected: the bar itself renders nothing then, but it must
 * be there to move keyboard focus to the main content when the last car is removed.
 */
export function CompareBarHost() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  // The bar publishes its height on <html> while it is shown and leaves the value there when it
  // empties, which would keep the room under the footer. Without the value the page's own default applies.
  useEffect(() => {
    if (count === 0) document.documentElement.style.removeProperty("--bar-height");
  }, [count]);

  const compareHref = buildCompareHref({
    pathname,
    query: pickAssumptionParams(new URLSearchParams(searchParams)).toString(),
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
