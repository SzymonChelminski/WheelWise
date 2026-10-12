import type { NavItem } from "@/components/layout/SiteShell";
import type { Translate } from "../car/car-view";

/*
 * Navigation items and label sets of the header and the footer. Shared by the
 * server-rendered fallback and the client components that follow the URL.
 */
export interface NavContext {
  /** Current path without the locale prefix. */
  pathname: string;
  /** Assumption parameters of the current URL, without "?". Empty when there are none. */
  query: string;
  /** Slugs in the comparison. */
  compareSlugs: readonly string[];
}

function withQuery(path: string, query: string): string {
  if (!query) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}

export function compareHref({ compareSlugs, query }: NavContext): string {
  // Slugs contain only lower-case letters, digits and hyphens, so the commas stay readable.
  const cars = compareSlugs.length > 0 ? `/compare?cars=${compareSlugs.join(",")}` : "/compare";
  return withQuery(cars, query);
}

export function mainNav(t: Translate, context: NavContext): NavItem[] {
  const { pathname, query, compareSlugs } = context;
  const on = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  return [
    { href: withQuery("/rankings", query), label: t("header.rankings"), current: on("/rankings") },
    {
      href: compareHref(context),
      label: t("header.compare"),
      current: on("/compare"),
      badge: compareSlugs.length > 0 ? String(compareSlugs.length) : undefined,
      badgeLabel: t("header.compareCount", { count: compareSlugs.length }),
    },
    {
      href: withQuery("/methodology", query),
      label: t("header.methodology"),
      current: on("/methodology"),
    },
  ];
}

export function footerNav(t: Translate, context: NavContext): { href: string; label: string }[] {
  return [
    { href: withQuery("/", context.query), label: t("common.home") },
    ...mainNav(t, context).map(({ href, label }) => ({ href, label })),
  ];
}

export function headerLabels(t: Translate) {
  return {
    homeLink: t("header.homeLink"),
    nav: t("header.nav"),
    language: t("header.language"),
    languageNames: { pl: t("header.languageNames.pl"), en: t("header.languageNames.en") },
  };
}

export function footerLabels(t: Translate) {
  return {
    about: t("footer.about"),
    nav: t("footer.nav"),
    sourcesTitle: t("footer.sourcesTitle"),
    sources: [
      t("footer.sources.catalogue"),
      t("footer.sources.fuel"),
      t("footer.sources.electricity"),
      t("footer.sources.exchange"),
    ],
    disclaimer: t("footer.disclaimer"),
  };
}
