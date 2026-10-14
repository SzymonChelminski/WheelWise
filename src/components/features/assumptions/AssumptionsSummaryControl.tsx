"use client";

import { useLocale, useTranslations } from "next-intl";
import { AssumptionsSummary } from "@/components/ui/AssumptionsPanel";
import { SheetDisclosure } from "@/components/ui/Sheet";
import type { Locale } from "@/lib/format";
import { useAssumptions } from "@/lib/state/assumptions-client";
import { AssumptionsControls } from "./AssumptionsControls";
import { assumptionsSummary } from "./summary";

/** The one-line summary of the assumptions with the sheet that changes them; it shows the intended query. */
export function AssumptionsSummaryControl({ className }: { className?: string }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { assumptions } = useAssumptions();

  return (
    <AssumptionsSummary
      className={className}
      label={t("assumptions.title")}
      summary={assumptionsSummary(t, locale, assumptions)}
      action={
        <SheetDisclosure
          triggerLabel={t("assumptions.change")}
          triggerSize="sm"
          title={t("assumptions.title")}
          closeLabel={t("common.close")}
          applyLabel={t("assumptions.done")}
        >
          <AssumptionsControls />
        </SheetDisclosure>
      }
    />
  );
}
