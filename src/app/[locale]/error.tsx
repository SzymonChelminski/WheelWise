"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/SiteShell";
import { Button, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { h1Class } from "@/components/ui/styles";
import { PageLink } from "@/components/features/PageLink";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations();

  return (
    <Container className="py-12 md:py-20">
      <div className="max-w-xl">
        <Icon name="alert" size={24} className="text-danger" />
        <h1 className={`${h1Class} mt-2`}>{t("errorPage.title")}</h1>
        <p className="mt-4 text-lg text-ink-muted">{t("errorPage.text")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button icon="refresh" onClick={() => retry()}>
            {t("common.retry")}
          </Button>
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
