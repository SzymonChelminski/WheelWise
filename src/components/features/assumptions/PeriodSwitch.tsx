"use client";

import { useTranslations } from "next-intl";
import { useId, type ComponentProps } from "react";
import { SegmentedSwitch } from "@/components/ui/Choice";
import { useAssumptions } from "@/lib/state/assumptions-client";

/**
 * Month / year switch. The period lives in the URL with the other assumptions.
 * `fullWidth` and `className` are passed to the switch (the rankings page fills its row below 640 px).
 */
export function PeriodSwitch({
  fullWidth,
  className,
}: {
  fullWidth?: ComponentProps<typeof SegmentedSwitch>["fullWidth"];
  className?: string;
}) {
  const t = useTranslations("period");
  // The radio group of a page kept hidden after a navigation must not join this one.
  const name = useId();
  const { period, setPeriod } = useAssumptions();

  return (
    <SegmentedSwitch
      name={name}
      legend={t("legend")}
      fullWidth={fullWidth}
      className={className}
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
