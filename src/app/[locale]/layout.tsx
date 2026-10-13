import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Footer, Header, SiteShell } from "@/components/layout/SiteShell";
import { fontVariables } from "@/components/ui/fonts";
import { CompareBarHost } from "@/components/features/compare/CompareBarHost";
import { DataFreshnessLine } from "@/components/features/shell/DataFreshnessLine";
import { IntendedQueryHost } from "@/components/features/shell/IntendedQueryHost";
import {
  footerLabels,
  footerNav,
  headerLabels,
  mainNav,
  type NavContext,
} from "@/components/features/shell/nav";
import { SearchIndexProvider } from "@/components/features/shell/SearchIndexProvider";
import { SiteFooter } from "@/components/features/shell/SiteFooter";
import { SiteHeader } from "@/components/features/shell/SiteHeader";
import { SITE_URL } from "@/config/site";
import { getSearchIndex } from "@/lib/data/search-index";
import { routing } from "@/i18n/routing";
import "../globals.css";

export const metadata: Metadata = {
  title: "WheelWise",
  metadataBase: new URL(SITE_URL),
};

export const viewport: Viewport = {
  // The value of the --color-ground token: a meta tag cannot read a CSS variable.
  themeColor: "#f1f4f5",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// What the header and footer show until the browser knows the URL: no current page, no parameters.
const NO_URL: NavContext = { pathname: "/", query: "", compareSlugs: [] };

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, t, searchIndex] = await Promise.all([
    getLocale() as Promise<"pl" | "en">,
    getTranslations(),
    getSearchIndex(),
  ]);

  // The shell reserves room for the comparison bar below the footer. The bar publishes its
  // height as --bar-height only while it is shown; the class keeps the footer free of that room
  // while nothing is selected (the inline value from the bar wins whenever it is present).
  return (
    <html lang={locale} className={`${fontVariables} [--bar-height:0px]`}>
      <body className="bg-ground font-sans text-base text-ink antialiased">
        <NextIntlClientProvider>
          <Suspense fallback={null}>
            <IntendedQueryHost />
          </Suspense>
          <SearchIndexProvider index={searchIndex}>
            <SiteShell
              skipLabel={t("common.skip")}
              header={
                <Suspense
                  fallback={
                    <Header
                      locale={locale}
                      pathname="/"
                      nav={mainNav(t, NO_URL)}
                      labels={headerLabels(t)}
                    />
                  }
                >
                  <SiteHeader />
                </Suspense>
              }
              footer={
                <Suspense
                  fallback={
                    <Footer nav={footerNav(t, NO_URL)} labels={footerLabels(t)}>
                      <DataFreshnessLine />
                    </Footer>
                  }
                >
                  <SiteFooter>
                    <DataFreshnessLine />
                  </SiteFooter>
                </Suspense>
              }
              compareBar={
                <Suspense fallback={null}>
                  <CompareBarHost />
                </Suspense>
              }
            >
              {children}
            </SiteShell>
          </SearchIndexProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
