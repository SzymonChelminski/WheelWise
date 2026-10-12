import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Container } from "@/components/layout/SiteShell";
import { AssumptionsRestore } from "@/components/features/assumptions/AssumptionsRestore";
import { HomeLists, HomeListsFallback } from "@/components/features/home/HomeLists";
import { SiteSearch } from "@/components/features/search/SiteSearch";
import { pageMetadata } from "@/components/features/shell/page-metadata";
import type { RawParams } from "@/lib/state/assumption-params";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return pageMetadata((await params).locale, "home", "");
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const t = await getTranslations("home");

  return (
    <>
      <AssumptionsRestore />
      <section data-surface="dark" className="bg-brand-strong text-on-brand">
        <Container className="pt-8 pb-10 md:pt-14 md:pb-16">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-lg text-on-brand-muted">{t("intro")}</p>
            <SiteSearch size="lg" className="mt-6" />
          </div>
        </Container>
      </section>

      <Container className="py-10 md:py-14">
        <Suspense fallback={<HomeListsFallback />}>
          <HomeLists searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}
