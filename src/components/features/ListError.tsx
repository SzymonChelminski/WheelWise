"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Feedback";
import { useRouter } from "@/i18n/navigation";

/** Where focus goes after a retry: the heading of the section that held the error, or of the page. */
type RetryScope = { container: Element; headings: string[] };

function focusHeading({ container, headings }: RetryScope): void {
  const active = document.activeElement;
  if (active && active !== document.body) return;
  // A section on a page that is kept hidden after a navigation has no boxes.
  if (container.getClientRects().length === 0) return;
  const heading = headings.map((selector) => container.querySelector<HTMLElement>(selector)).find(Boolean);
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus();
}

/*
 * Stands in the place of something that failed to load. Retry asks the server for the page
 * again without a full reload; the filters, assumptions and everything else stay as they are.
 * When the retry succeeds this component is removed together with the button that has focus, and
 * the browser would drop focus to <body>; the heading of the section that held it gets focus then.
 * An error that stands outside any section, directly under the h1 of its page, hands focus to that h1.
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
  const retried = useRef<RetryScope | null>(null);

  // Runs when the error is replaced by what it stood for. A failing retry keeps this component mounted.
  useEffect(
    () => () => {
      const scope = retried.current;
      retried.current = null;
      if (scope) focusHeading(scope);
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
            const section = event.currentTarget.closest("section");
            const main = document.querySelector("main");
            if (section) retried.current = { container: section, headings: ["[data-results-heading]", "h2"] };
            else if (main) retried.current = { container: main, headings: ["h1"] };
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
export function ListError({ className, variant = "list" }: { className?: string; variant?: "list" | "home" }) {
  const t = useTranslations("listError");
  // The home page has no filters or assumptions to keep, so its text names neither.
  return (
    <LoadError title={t("title")} className={className}>
      <p>{t(variant === "home" ? "homeText" : "text")}</p>
    </LoadError>
  );
}
