"use client";

import { useState } from "react";
import { CompareBar, type CompareBarCar } from "@/components/ui/CompareBar";
import type { Locale } from "@/components/ui/format";
import { copy } from "@/mocks/copy";
import { P } from "../_lib/view";

/*
 * The comparison bar with a working selection, so that "remove" and "clear"
 * can be tried in the preview (the header badge and the toggles on the page do
 * not follow). On the real pages the selection lives outside the bar; pass it
 * in through `cars`, `onRemove` and `onClear` in the same way.
 */
export function CompareBarDemo({
  locale,
  cars,
  position,
  hintId,
  showWhenEmpty,
  limitReached,
  defaultExpanded,
}: {
  locale: Locale;
  cars: CompareBarCar[];
  position?: "fixed" | "static";
  hintId?: string;
  showWhenEmpty?: boolean;
  limitReached?: boolean;
  defaultExpanded?: boolean;
}) {
  const t = copy[locale].compareBar;
  const [removed, setRemoved] = useState<string[]>([]);
  const selected = cars.filter((car) => !removed.includes(car.slug));
  return (
    <CompareBar
      cars={selected}
      compareHref={`${P}/compare`}
      position={position}
      hintId={hintId}
      showWhenEmpty={showWhenEmpty}
      defaultExpanded={defaultExpanded}
      // The limit message stays until the selection changes.
      notice={limitReached && removed.length === 0 ? t.limit : undefined}
      onRemove={(slug) => setRemoved((current) => [...current, slug])}
      onClear={() => setRemoved(cars.map((car) => car.slug))}
      labels={{
        region: t.region,
        toggle: t.toggle(selected.length),
        list: t.list,
        count: t.count(selected.length),
        compare: t.compare(selected.length),
        compareIdle: t.compareIdle,
        needMore: t.needMore,
        empty: t.empty,
        full: t.full,
        remove: t.remove,
        clear: t.clear,
      }}
    />
  );
}
