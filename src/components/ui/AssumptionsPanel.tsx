import type { ReactNode } from "react";
import { SegmentedSwitch } from "./Choice";
import { cn } from "./cn";
import { NumberField, Select } from "./Fields";
import { Icon } from "./Icon";

/*
 * Assumptions: the three things the user tells us (yearly mileage, ownership
 * period, insurance). The panel is a plain form section; it is shown in the
 * aside of the car page (from 1024 px) and inside a Sheet everywhere else.
 */
export type AssumptionField =
  | "annualMileageKm"
  | "ownershipYears"
  | "insuranceMode"
  | "driverAgeBand"
  | "coverage"
  | "annualPremiumPln";

export interface AssumptionValues {
  annualMileageKm: string;
  ownershipYears: string;
  insuranceMode: "estimate" | "custom";
  driverAgeBand: string;
  coverage: "oc" | "oc_ac";
  annualPremiumPln: string;
}

export interface AssumptionsLabels {
  mileage: string;
  mileageUnit: string;
  mileageHint: string;
  years: string;
  /** Ten options, "1 rok" … "10 lat", index 0 = 1 year. */
  yearOptions: string[];
  insurance: string;
  insuranceEstimate: string;
  insuranceCustom: string;
  ageBand: string;
  /** Text for each age band value, e.g. { "18-24": "18–24 lata" }. */
  ageBandOptions: { value: string; label: string }[];
  coverage: string;
  coverageOc: string;
  coverageOcAc: string;
  premium: string;
  premiumUnit: string;
  premiumHint: string;
}

export function AssumptionsPanel({
  idPrefix,
  labels,
  values,
  errors = {},
  onChange,
  className,
}: {
  /** Prefix for control ids and radio names; unique per panel instance on a page. */
  idPrefix: string;
  labels: AssumptionsLabels;
  values: AssumptionValues;
  /** Error text per field; see DESIGN.md section 9 for the wording. */
  errors?: Partial<Record<"annualMileageKm" | "annualPremiumPln", string>>;
  /** Without it the panel is uncontrolled (static preview). */
  onChange?: (field: AssumptionField, value: string) => void;
  className?: string;
}) {
  const bind = (field: AssumptionField, value: string) =>
    onChange
      ? {
          value,
          onChange: (event: { target: { value: string } }) =>
            onChange(field, event.target.value),
        }
      : { defaultValue: value };
  const radio = (field: AssumptionField, value: string) =>
    onChange
      ? { value, onChange: (next: string) => onChange(field, next) }
      : { defaultValue: value };

  return (
    <div className={cn("space-y-5", className)}>
      <NumberField
        id={`${idPrefix}-km`}
        name="km"
        label={labels.mileage}
        unit={labels.mileageUnit}
        hint={labels.mileageHint}
        error={errors.annualMileageKm}
        {...bind("annualMileageKm", values.annualMileageKm)}
      />
      <Select
        id={`${idPrefix}-years`}
        name="years"
        label={labels.years}
        {...bind("ownershipYears", values.ownershipYears)}
      >
        {labels.yearOptions.map((text, index) => (
          <option key={text} value={String(index + 1)}>
            {text}
          </option>
        ))}
      </Select>

      <div className="space-y-4 border-t border-line pt-5">
        <SegmentedSwitch
          name={`${idPrefix}-ins-mode`}
          legend={labels.insurance}
          hideLegend={false}
          fullWidth
          options={[
            { value: "estimate", label: labels.insuranceEstimate },
            { value: "custom", label: labels.insuranceCustom },
          ]}
          {...radio("insuranceMode", values.insuranceMode)}
        />
        {values.insuranceMode === "estimate" ? (
          <>
            <Select
              id={`${idPrefix}-age`}
              name="age"
              label={labels.ageBand}
              {...bind("driverAgeBand", values.driverAgeBand)}
            >
              {labels.ageBandOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <SegmentedSwitch
              name={`${idPrefix}-cov`}
              legend={labels.coverage}
              hideLegend={false}
              fullWidth
              options={[
                { value: "oc", label: labels.coverageOc },
                { value: "oc_ac", label: labels.coverageOcAc },
              ]}
              {...radio("coverage", values.coverage)}
            />
          </>
        ) : (
          <NumberField
            id={`${idPrefix}-premium`}
            name="ins"
            label={labels.premium}
            unit={labels.premiumUnit}
            hint={labels.premiumHint}
            error={errors.annualPremiumPln}
            {...bind("annualPremiumPln", values.annualPremiumPln)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * One-line summary of the current assumptions with the control that opens the
 * panel. Keeps the inputs behind every estimate visible at all times.
 */
export function AssumptionsSummary({
  label,
  summary,
  action,
  className,
}: {
  /** "Założenia" */
  label: string;
  /** "15 000 km rocznie, 5 lat, OC + AC, kierowca 35–44 lata" */
  summary: string;
  /** Slot for the SheetDisclosure trigger ("Zmień"). */
  action: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-line bg-surface py-2 pr-2 pl-4",
        className,
      )}
    >
      <Icon name="gauge" className="text-ink-muted" />
      <p className="min-w-0 flex-1 py-1 text-sm text-ink">
        <span className="font-semibold">{label}: </span>
        {summary}
      </p>
      {action}
    </div>
  );
}
