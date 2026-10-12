import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { DataFreshness } from "@/components/ui/Markers";
import { getCatalog } from "@/lib/data/catalog";
import { formatDate, type Locale } from "@/lib/format";

function latest(dates: string[]): string | undefined {
  return dates.reduce<string | undefined>((a, b) => (a === undefined || b > a ? b : a), undefined);
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

  // An empty catalogue has no price list date; the line then leaves that part out.
  const catalogueIso = latest(cars.map((car) => car.priceObservedAt));
  const fuelIso = latest([prices.petrol, prices.diesel, prices.lpg].map((price) => price.observedAt));
  const checkedIso = lastRefresh?.slice(0, 10);
  if (fuelIso === undefined) return null;

  const time = (iso: string) => {
    const Time = (chunks: ReactNode) => <time dateTime={iso}>{chunks}</time>;
    return Time;
  };
  const values = {
    fuelDate: formatDate(fuelIso, locale),
    fuel: time(fuelIso),
    ...(catalogueIso && { catalogueDate: formatDate(catalogueIso, locale), catalogue: time(catalogueIso) }),
    ...(checkedIso && { checkedDate: formatDate(checkedIso, locale), checked: time(checkedIso) }),
  };
  const key = `${checkedIso ? "freshnessChecked" : "freshness"}${catalogueIso ? "" : "NoCatalogue"}` as const;

  return <DataFreshness tone="dark">{t.rich(key, values)}</DataFreshness>;
}
