import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Container } from "@/components/layout/SiteShell";
import { RankingListSkeleton } from "@/components/ui/Feedback";
import { h1Class } from "@/components/ui/styles";
import { AssumptionsRestore } from "@/components/features/assumptions/AssumptionsRestore";
import { RankingsContent } from "@/components/features/rankings/RankingsContent";
import { pageMetadata } from "@/components/features/shell/page-metadata";
import type { RawParams } from "@/lib/state/assumption-params";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return pageMetadata((await params).locale, "rankings", "/rankings");
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const t = await getTranslations("rankings");

  return (
    <Container className="py-8 md:py-12">
      <AssumptionsRestore />
      <h1 className={h1Class}>{t("title")}</h1>
      <Suspense
        fallback={
          <div className="mt-6">
            <RankingListSkeleton rows={5} label={t("loading")} />
          </div>
        }
      >
        <RankingsContent searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
