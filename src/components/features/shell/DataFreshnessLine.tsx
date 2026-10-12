import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { DataFreshness } from "@/components/ui/Markers";
import { getCatalog } from "@/lib/data/catalog";
import { formatDate, type Locale } from "@/lib/format";

function latest(dates: string[]): string {
  return dates.reduce((a, b) => (a > b ? a : b));
}

/**
 * When the data was last checked and how old each price list is. The check date
 * appears only when a refresh run has finished.
 */
export async function DataFreshnessLine() {
  const [{ cars, prices, lastRefresh }, t, locale] = await Promise.all([
    getCatalog(),
    getTranslations("footer"),
    getLocale() as Promise<Locale>,
  ]);

  const catalogueIso = latest(cars.map((car) => car.priceObservedAt));
  const fuelIso = latest([prices.petrol, prices.diesel, prices.lpg].map((price) => price.observedAt));
  const checkedIso = lastRefresh?.slice(0, 10);

  const time = (iso: string) => {
    const Time = (chunks: ReactNode) => <time dateTime={iso}>{chunks}</time>;
    return Time;
  };
  const values = {
    fuelDate: formatDate(fuelIso, locale),
    catalogueDate: formatDate(catalogueIso, locale),
    fuel: time(fuelIso),
    catalogue: time(catalogueIso),
  };

  return (
    <DataFreshness tone="dark">
      {checkedIso
        ? t.rich("freshnessChecked", {
            ...values,
            checkedDate: formatDate(checkedIso, locale),
            checked: time(checkedIso),
          })
        : t.rich("freshness", values)}
    </DataFreshness>
  );
}
