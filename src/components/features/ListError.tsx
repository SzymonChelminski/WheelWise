"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Feedback";
import { useRouter } from "@/i18n/navigation";

function focusSectionHeading(section: Element): void {
  const active = document.activeElement;
  if (active && active !== document.body) return;
  // A section on a page that is kept hidden after a navigation has no boxes.
  if (section.getClientRects().length === 0) return;
  const heading =
    section.querySelector<HTMLElement>("[data-results-heading]") ?? section.querySelector<HTMLElement>("h2");
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus();
}

/*
 * Stands in the place of something that failed to load. Retry asks the server for the page
 * again without a full reload; the filters, assumptions and everything else stay as they are.
 * When the retry succeeds this component is removed together with the button that has focus, and
 * the browser would drop focus to <body>; the heading of the section that held it gets focus then.
 */
export function LoadError({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const retriedIn = useRef<Element | null>(null);

  // Runs when the error is replaced by what it stood for. A failing retry keeps this component mounted.
  useEffect(
    () => () => {
      const section = retriedIn.current;
      retriedIn.current = null;
      if (section) focusSectionHeading(section);
    },
    [],
  );

  return (
    <InlineError
      title={title}
      className={className}
      action={
        <Button
          variant="secondary"
          size="sm"
          icon="refresh"
          loading={pending}
          onClick={(event) => {
            retriedIn.current = event.currentTarget.closest("section");
            startTransition(() => router.refresh());
          }}
        >
          {t("retry")}
        </Button>
      }
    >
      {children}
    </InlineError>
  );
}

/** The error state of a ranking list. */
export function ListError({ className }: { className?: string }) {
  const t = useTranslations("listError");
  return (
    <LoadError title={t("title")} className={className}>
      <p>{t("text")}</p>
    </LoadError>
  );
}
