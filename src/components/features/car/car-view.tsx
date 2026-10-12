import type { ReactNode } from "react";
import { CarMeta, type PowerText } from "@/components/ui/CarMeta";
import type { BodyType, FuelType, Transmission } from "@/lib/domain/types";
import { formatInteger, type Locale } from "@/lib/format";

/** A translator for the root of the message files (`useTranslations()` or `getTranslations()`). */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface CarFacts {
  bodyType: BodyType;
  fuelType: FuelType;
  transmission: Transmission;
  powerKw: number;
}

/** A car is named make + variant everywhere. */
export function carName(car: { make: string; variant: string }): string {
  return `${car.make} ${car.variant}`;
}

// 1 kW = 1.35962 metric horsepower (KM / PS).
const HORSEPOWER_PER_KW = 1.35962;

function horsepower(powerKw: number, t: Translate): string {
  return `${Math.round(powerKw * HORSEPOWER_PER_KW)} ${t("attr.horsepower")}`;
}

/**
 * Which kind of power the source gives: engine power for petrol, diesel and LPG,
 * the combustion engine only for hybrids, usually the rated power for electric cars.
 */
function powerKind(fuelType: FuelType): "plain" | "engine" | "source" {
  if (fuelType === "ev") return "source";
  return fuelType === "hybrid" || fuelType === "phev" ? "engine" : "plain";
}

/** Short and full text of the power label; the full text is "<kind of power>: <value>". */
export function powerText(t: Translate, locale: Locale, car: CarFacts): PowerText {
  const kind = powerKind(car.fuelType);
  const hp = horsepower(car.powerKw, t);
  return {
    short: t(`power.${kind}.short`, { hp }),
    full: `${t(`power.${kind}.label`)}: ${formatInteger(car.powerKw, locale)} kW (${hp})`,
  };
}

/** The attributes that always accompany a name: body type, fuel, gearbox, power. */
export function carMeta(t: Translate, locale: Locale, car: CarFacts): ReactNode {
  return (
    <CarMeta
      attributes={[
        t(`attr.body.${car.bodyType}`),
        t(`attr.fuel.${car.fuelType}`),
        t(`attr.transmission.${car.transmission}`),
      ]}
      power={powerText(t, locale, car)}
    />
  );
}

/** True when a list shows cars whose power is not plain engine power. */
export function hasSpecialPower(fuelTypes: readonly FuelType[]): boolean {
  return fuelTypes.some((fuelType) => powerKind(fuelType) !== "plain");
}
