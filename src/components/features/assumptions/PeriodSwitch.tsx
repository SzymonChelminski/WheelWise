"use client";

import { useTranslations } from "next-intl";
import { SegmentedSwitch } from "@/components/ui/Choice";
import { useAssumptions } from "@/lib/state/assumptions-client";

/** Month / year switch. The period lives in the URL with the other assumptions. */
export function PeriodSwitch({ name = "period" }: { name?: string }) {
  const t = useTranslations("period");
  const { period, setPeriod } = useAssumptions();

  return (
    <SegmentedSwitch
      name={name}
      legend={t("legend")}
      value={period}
      onChange={(value) => {
        if (value === "month" || value === "year") setPeriod(value);
      }}
      options={[
        { value: "month", label: t("month") },
        { value: "year", label: t("year") },
      ]}
    />
  );
}
