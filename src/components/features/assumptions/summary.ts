import type { Assumptions } from "@/lib/domain/types";
import { formatInteger, formatPln, type Locale } from "@/lib/format";
import type { Translate } from "../car/car-view";

/** One line with the assumptions behind the amounts on a page: "15 000 km rocznie, 5 lat, OC + AC, kierowca 35–44 lata". */
export function assumptionsSummary(t: Translate, locale: Locale, assumptions: Assumptions): string {
  const km = formatInteger(assumptions.annualMileageKm, locale);
  const years = t("assumptions.yearsValue", { count: assumptions.ownershipYears });
  const { insurance } = assumptions;

  if (insurance.mode === "custom") {
    return t("assumptions.summaryCustom", {
      km,
      years,
      premium: formatPln(insurance.annualPremiumPln, locale),
    });
  }
  return t("assumptions.summaryEstimate", {
    km,
    years,
    coverage: t(`assumptions.coverageShort.${insurance.coverage}`),
    age: t(`assumptions.ageBandsInSummary.${insurance.driverAgeBand}`),
  });
}
