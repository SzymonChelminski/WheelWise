"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Feedback";
import { useRouter } from "@/i18n/navigation";

/*
 * Stands in the place of something that failed to load. Retry asks the server for the page
 * again without a full reload; the filters, assumptions and everything else stay as they are.
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
          onClick={() => startTransition(() => router.refresh())}
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
