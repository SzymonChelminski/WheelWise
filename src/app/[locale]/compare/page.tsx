import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Container } from "@/components/layout/SiteShell";
import { ComparisonSkeleton } from "@/components/ui/Feedback";
import { h1Class } from "@/components/ui/styles";
import { AssumptionsRestore } from "@/components/features/assumptions/AssumptionsRestore";
import { CompareContent } from "@/components/features/compare/CompareContent";
import { pageMetadata } from "@/components/features/shell/page-metadata";
import type { RawParams } from "@/lib/state/assumption-params";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return pageMetadata((await params).locale, "compare", "/compare");
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const t = await getTranslations("compare");

  return (
    <Container className="py-8 md:py-12">
      <AssumptionsRestore />
      <Suspense
        fallback={
          <>
            <h1 className={h1Class}>{t("title")}</h1>
            <div className="mt-6">
              <ComparisonSkeleton label={t("loading")} />
            </div>
          </>
        }
      >
        <CompareContent searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
