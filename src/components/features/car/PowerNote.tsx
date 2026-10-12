import { getTranslations } from "next-intl/server";
import { InfoNote } from "@/components/ui/Markers";
import { linkClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { FuelType } from "@/lib/domain/types";
import { hasSpecialPower } from "./car-view";

/** Explains the kind of power shown for hybrids and electric cars; nothing for other lists. */
export async function PowerNote({ fuelTypes, className }: { fuelTypes: FuelType[]; className?: string }) {
  if (!hasSpecialPower(fuelTypes)) return null;
  const t = await getTranslations("power");
  return (
    <InfoNote className={className}>
      {t("listNote")}{" "}
      <Link href={`/methodology#${t("methodologyAnchor")}`} className={linkClass}>
        {t("methodologyLink")}
      </Link>
    </InfoNote>
  );
}
