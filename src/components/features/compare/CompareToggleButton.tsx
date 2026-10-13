"use client";

import { useTranslations } from "next-intl";
import { COMPARE_BAR_HINT_ID } from "@/components/ui/CompareBar";
import { CompareToggle } from "@/components/ui/CompareToggle";
import { useCompare } from "@/lib/state/compare-client";

/**
 * Adds a car to the comparison or takes it out. With three cars chosen it raises the limit message.
 * `standalone` is for a toggle that is not in a list (the car page): larger, and it prints the
 * reason itself when the comparison is full.
 */
export function CompareToggleButton({
  slug,
  name,
  standalone = false,
  className,
}: {
  slug: string;
  name: string;
  standalone?: boolean;
  className?: string;
}) {
  const t = useTranslations("compareToggle");
  const { slugs, add, remove, isFull } = useCompare();
  const pressed = slugs.includes(slug);

  return (
    <CompareToggle
      pressed={pressed}
      full={isFull && !pressed}
      size={standalone ? "md" : "sm"}
      showHint={standalone}
      describedBy={standalone ? undefined : COMPARE_BAR_HINT_ID}
      className={className}
      carName={name}
      labels={{ add: t("add"), added: t("added"), fullHint: t("fullHint") }}
      onClick={() => (pressed ? remove(slug) : add(slug))}
    />
  );
}
