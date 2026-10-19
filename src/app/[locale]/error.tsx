"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Container } from "@/components/layout/SiteShell";
import { Button, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { h1Class } from "@/components/ui/styles";
import { PageLink } from "@/components/features/PageLink";
import { rendered } from "@/components/features/rankings/results-focus";

/** The page that replaces the error gets focus; the button that had it is gone and the browser would use <body>. */
function focusPage(): void {
  const active = document.activeElement;
  if (active && active !== document.body) return;
  const target = rendered("main h1")[0] ?? rendered("main")[0];
  if (!target) return;
  target.tabIndex = -1;
  target.focus();
}

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations();
  const retried = useRef(false);

  // Runs when the error is replaced by the page it stood for. A failing retry shows this page again.
  useEffect(
    () => () => {
      if (!retried.current) return;
      retried.current = false;
      focusPage();
    },
    [],
  );

  function onRetry() {
    retried.current = true;
    retry();
  }

  return (
    <Container className="py-12 md:py-20">
      <title>{t("meta.error.title")}</title>
      <div className="max-w-xl">
        <Icon name="alert" size={24} className="text-danger" />
        <h1 className={`${h1Class} mt-2`}>{t("errorPage.title")}</h1>
        <p className="mt-4 text-lg text-ink-muted">{t("errorPage.text")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button icon="refresh" onClick={onRetry}>
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
