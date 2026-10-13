"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AssumptionsPanel, type AssumptionField } from "@/components/ui/AssumptionsPanel";
import { ASSUMPTION_LIMITS, DRIVER_AGE_BANDS } from "@/lib/domain/assumptions";
import type { DriverAgeBand } from "@/lib/domain/types";
import { estimateOf, useAssumptions } from "@/lib/state/assumptions-client";
import { useDebouncedRun, useSyncedDraft } from "../use-draft";

/** A whole number typed as digits within the limits, or null. Nothing else reaches the cost engine. */
function parseDigits(raw: string, limits: { min: number; max: number }): number | null {
  const text = raw.trim();
  if (!/^\d{1,9}$/.test(text)) return null;
  const value = Number(text);
  return value >= limits.min && value <= limits.max ? value : null;
}

function isAgeBand(value: string): value is DriverAgeBand {
  return (DRIVER_AGE_BANDS as readonly string[]).includes(value);
}

/**
 * The assumptions form: yearly mileage, ownership period and insurance. A valid
 * change goes to the URL (and the browser's storage) at once; text fields wait
 * until the user stops typing and show an error instead of applying a bad value.
 */
export function AssumptionsControls({ idPrefix }: { idPrefix: string }) {
  const t = useTranslations();
  const { assumptions, estimate, setAssumptions } = useAssumptions();
  const { run, cancel } = useDebouncedRun();

  const urlMode = assumptions.insurance.mode;
  const premium = assumptions.insurance.mode === "custom" ? assumptions.insurance.annualPremiumPln : null;

  const [kmDraft, setKmDraft] = useSyncedDraft(String(assumptions.annualMileageKm));
  const [premiumDraft, setPremiumDraft] = useSyncedDraft(premium === null ? "" : String(premium));
  // "Own premium" can be chosen before a premium is typed; the URL only knows it once there is one.
  const [mode, setMode] = useSyncedDraft(urlMode);
  const [kmError, setKmError] = useState(false);
  const [premiumError, setPremiumError] = useState(false);

  function applyMileage(raw: string) {
    const value = parseDigits(raw, ASSUMPTION_LIMITS.annualMileageKm);
    setKmError(value === null);
    if (value === null) return;
    setAssumptions((current) =>
      current.annualMileageKm === value ? current : { ...current, annualMileageKm: value },
    );
  }

  function applyPremium(raw: string) {
    const value = parseDigits(raw, ASSUMPTION_LIMITS.annualPremiumPln);
    setPremiumError(value === null);
    if (value === null) return;
    setAssumptions((current) =>
      current.insurance.mode === "custom" && current.insurance.annualPremiumPln === value
        ? current
        : { ...current, insurance: { mode: "custom", annualPremiumPln: value } },
    );
  }

  function onChange(field: AssumptionField, value: string) {
    switch (field) {
      case "annualMileageKm":
        setKmDraft(value);
        if (parseDigits(value, ASSUMPTION_LIMITS.annualMileageKm) !== null) setKmError(false);
        run(() => applyMileage(value));
        break;
      case "ownershipYears": {
        const years = parseDigits(value, ASSUMPTION_LIMITS.ownershipYears);
        if (years !== null) setAssumptions((current) => ({ ...current, ownershipYears: years }));
        break;
      }
      case "insuranceMode":
        if (value === "custom") {
          setMode("custom");
          if (premiumDraft.trim() !== "") applyPremium(premiumDraft);
        } else if (value === "estimate") {
          setMode("estimate");
          setPremiumError(false);
          setAssumptions((current) =>
            current.insurance.mode === "custom" ? { ...current, insurance: estimateOf(current.insurance) } : current,
          );
        }
        break;
      case "driverAgeBand":
        if (isAgeBand(value)) {
          setAssumptions((current) => ({
            ...current,
            insurance: { ...estimateOf(current.insurance), driverAgeBand: value },
          }));
        }
        break;
      case "coverage":
        if (value === "oc" || value === "oc_ac") {
          setAssumptions((current) => ({
            ...current,
            insurance: { ...estimateOf(current.insurance), coverage: value },
          }));
        }
        break;
      case "annualPremiumPln":
        setPremiumDraft(value);
        if (parseDigits(value, ASSUMPTION_LIMITS.annualPremiumPln) !== null) setPremiumError(false);
        run(() => applyPremium(value));
        break;
    }
  }

  return (
    <div
      onBlur={(event) => {
        // Leaving a text field applies what was typed without waiting.
        const { id } = event.target;
        if (id === `${idPrefix}-km`) {
          cancel();
          applyMileage(kmDraft);
        } else if (id === `${idPrefix}-premium`) {
          cancel();
          if (premiumDraft.trim() !== "") applyPremium(premiumDraft);
        }
      }}
    >
      <AssumptionsPanel
        idPrefix={idPrefix}
        values={{
          annualMileageKm: kmDraft,
          ownershipYears: String(assumptions.ownershipYears),
          insuranceMode: mode === "custom" ? "custom" : "estimate",
          driverAgeBand: estimate.driverAgeBand,
          coverage: estimate.coverage,
          annualPremiumPln: premiumDraft,
        }}
        errors={{
          annualMileageKm: kmError ? t("assumptions.mileageError") : undefined,
          annualPremiumPln: premiumError ? t("assumptions.premiumError") : undefined,
        }}
        onChange={onChange}
        labels={{
          mileage: t("assumptions.mileage"),
          mileageUnit: t("assumptions.mileageUnit"),
          mileageHint: t("assumptions.mileageHint"),
          years: t("assumptions.years"),
          yearOptions: Array.from({ length: ASSUMPTION_LIMITS.ownershipYears.max }, (_, index) =>
            t("assumptions.yearsValue", { count: index + 1 }),
          ),
          insurance: t("assumptions.insurance"),
          insuranceEstimate: t("assumptions.insuranceEstimate"),
          insuranceCustom: t("assumptions.insuranceCustom"),
          ageBand: t("assumptions.ageBand"),
          ageBandOptions: DRIVER_AGE_BANDS.map((band) => ({
            value: band,
            label: t(`assumptions.ageBands.${band}`),
          })),
          coverage: t("assumptions.coverage"),
          coverageOc: t("assumptions.coverageOc"),
          coverageOcAc: t("assumptions.coverageOcAc"),
          premium: t("assumptions.premium"),
          premiumUnit: t("assumptions.premiumUnit"),
          premiumHint: t("assumptions.premiumHint"),
        }}
      />
    </div>
  );
}
