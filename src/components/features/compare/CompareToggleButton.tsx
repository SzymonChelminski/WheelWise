"use client";

import { useTranslations } from "next-intl";
import { COMPARE_BAR_HINT_ID } from "@/components/ui/CompareBar";
import { CompareToggle } from "@/components/ui/CompareToggle";
import { useCompare } from "@/lib/state/compare-client";

/** Adds a car to the comparison or takes it out. With three cars chosen it raises the limit message. */
export function CompareToggleButton({ slug, name }: { slug: string; name: string }) {
  const t = useTranslations("compareToggle");
  const { slugs, add, remove, isFull } = useCompare();
  const pressed = slugs.includes(slug);

  return (
    <CompareToggle
      pressed={pressed}
      full={isFull && !pressed}
      describedBy={COMPARE_BAR_HINT_ID}
      carName={name}
      labels={{ add: t("add"), added: t("added"), fullHint: t("fullHint") }}
      onClick={() => (pressed ? remove(slug) : add(slug))}
    />
  );
}
