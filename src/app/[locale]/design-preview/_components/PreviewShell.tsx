import type { ReactNode } from "react";
import { Footer, Header, SiteShell } from "@/components/layout/SiteShell";
import { CompareBar } from "@/components/ui/CompareBar";
import { formatDate, type Locale } from "@/components/ui/format";
import { DataFreshness } from "@/components/ui/Markers";
import { mockCars, mockDates } from "@/mocks/cars";
import { copy } from "@/mocks/copy";
import { carMeta, carName, P } from "../_lib/view";

export function Freshness({ locale, tone }: { locale: Locale; tone?: "light" | "dark" }) {
  const f = copy[locale].home.freshness(
    formatDate(mockDates.checkedAt, locale),
    formatDate(mockDates.fuelPricesAt, locale),
    formatDate(mockDates.catalogAt, locale),
  );
  return (
    <DataFreshness tone={tone}>
      {f.checked[0]} <time dateTime={mockDates.checkedAt}>{f.checked[1]}</time>. {f.fuel[0]}{" "}
      <time dateTime={mockDates.fuelPricesAt}>{f.fuel[1]}</time>, {f.catalog[0]}{" "}
      <time dateTime={mockDates.catalogAt}>{f.catalog[1]}</time>.
    </DataFreshness>
  );
}

export function PreviewCompareBar({
  locale,
  slugs,
  position,
  showWhenEmpty,
  limitReached,
  defaultExpanded,
}: {
  locale: Locale;
  slugs: string[];
  position?: "fixed" | "static";
  showWhenEmpty?: boolean;
  /** The user has just tried to add a fourth car: show the limit message. */
  limitReached?: boolean;
  defaultExpanded?: boolean;
}) {
  const t = copy[locale].compareBar;
  const cars = slugs.map((slug) => {
    const car = mockCars.find((item) => item.slug === slug)!;
    return { slug, name: carName(car), meta: carMeta(car, locale) };
  });
  return (
    <CompareBar
      cars={cars}
      compareHref={`${P}/compare`}
      position={position}
      showWhenEmpty={showWhenEmpty}
      defaultExpanded={defaultExpanded}
      notice={limitReached ? t.limit : undefined}
      labels={{
        region: t.region,
        toggle: t.toggle(cars.length),
        list: t.list,
        count: t.count(cars.length),
        compare: t.compare(cars.length),
        compareIdle: t.compareIdle,
        needMore: t.needMore,
        empty: t.empty,
        full: t.full,
        remove: t.remove,
        clear: t.clear,
      }}
    />
  );
}

export function PreviewShell({
  locale,
  path,
  current,
  compareSlugs = [],
  limitReached,
  children,
}: {
  locale: Locale;
  /** Path of this preview page without the locale, e.g. "/design-preview/home". */
  path: string;
  current?: "rankings" | "compare" | "methodology";
  /** Cars shown in the comparison bar; none hides the bar. */
  compareSlugs?: string[];
  /** Show the fourth-car message in the comparison bar. */
  limitReached?: boolean;
  children: ReactNode;
}) {
  const t = copy[locale];
  const nav = [
    { href: `${P}/rankings`, label: t.header.rankings, current: current === "rankings" },
    {
      href: `${P}/compare`,
      label: t.header.compare,
      current: current === "compare",
      badge: compareSlugs.length > 0 ? String(compareSlugs.length) : undefined,
      badgeLabel: t.header.compareCount(compareSlugs.length),
    },
    {
      href: `${P}/methodology`,
      label: t.header.methodology,
      current: current === "methodology",
    },
  ];
  return (
    <SiteShell
      skipLabel={t.common.skip}
      header={<Header locale={locale} pathname={path} nav={nav} labels={t.header} />}
      footer={
        <Footer nav={nav} labels={t.footer}>
          <Freshness locale={locale} tone="dark" />
        </Footer>
      }
      compareBar={
        compareSlugs.length > 0 ? (
          <PreviewCompareBar locale={locale} slugs={compareSlugs} limitReached={limitReached} />
        ) : undefined
      }
    >
      {children}
    </SiteShell>
  );
}
