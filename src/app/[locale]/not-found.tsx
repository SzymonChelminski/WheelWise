import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/SiteShell";
import { buttonClass } from "@/components/ui/Button";
import { h1Class } from "@/components/ui/styles";
import { PageLink } from "@/components/features/PageLink";
import { SiteSearch } from "@/components/features/search/SiteSearch";

export default async function NotFound() {
  const t = await getTranslations();

  // Metadata exported from this file is not applied; React moves this element into the head.
  return (
    <Container className="py-12 md:py-20">
      <title>{t("meta.notFound.title")}</title>
      <div className="max-w-xl">
        <h1 className={h1Class}>{t("notFound.title")}</h1>
        <p className="mt-4 text-lg text-ink-muted">{t("notFound.text")}</p>
        <SiteSearch className="mt-6" />
        <div className="mt-5 flex flex-wrap gap-3">
          <PageLink to={{ kind: "carry", path: "/rankings" }} className={buttonClass()}>
            {t("notFound.toRankings")}
          </PageLink>
          <PageLink
            to={{ kind: "carry", path: "/" }}
            className={buttonClass({ variant: "secondary" })}
          >
            {t("common.home")}
          </PageLink>
        </div>
      </div>
    </Container>
  );
}
