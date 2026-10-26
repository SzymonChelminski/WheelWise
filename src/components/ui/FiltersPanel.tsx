import type { ReactNode } from "react";
import { buttonClass } from "./Button";
import { CheckboxRow, FilterChip, SegmentedSwitch } from "./Choice";
import { cn } from "./cn";
import { NumberField, TextField } from "./Fields";
import { Icon } from "./Icon";

/*
 * Ranking filters. A plain form section: a sidebar from 1024 px, the content
 * of a Sheet below. Every option can carry the number of cars behind it; an
 * option with no cars is disabled, not hidden, so the list never jumps.
 */
export interface FilterOption {
  value: string;
  label: string;
  /** Formatted number of cars. */
  count?: string;
  selected?: boolean;
  disabled?: boolean;
}

export type FilterGroupKey = "body" | "fuel" | "segment" | "make";

export interface FiltersLabels {
  query: string;
  queryPlaceholder: string;
  price: string;
  priceMin: string;
  priceMax: string;
  priceUnit: string;
  body: string;
  fuel: string;
  transmission: string;
  transmissionAny: string;
  transmissionManual: string;
  transmissionAutomatic: string;
  segment: string;
  make: string;
}

function Group({
  legend,
  children,
  className,
}: {
  legend: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      {children}
    </fieldset>
  );
}

export function FiltersPanel({
  idPrefix,
  labels,
  query = "",
  priceMin = "",
  priceMax = "",
  priceError,
  transmission = "",
  bodyTypes,
  fuelTypes,
  segments,
  makes,
  onTextChange,
  onTransmissionChange,
  onToggle,
  className,
}: {
  /** Prefix for control ids and names; unique per panel instance on a page. */
  idPrefix: string;
  labels: FiltersLabels;
  query?: string;
  priceMin?: string;
  priceMax?: string;
  /** Shown under the price fields, e.g. when "from" is greater than "to". */
  priceError?: string;
  /** "", "manual" or "automatic". */
  transmission?: string;
  bodyTypes: FilterOption[];
  fuelTypes: FilterOption[];
  segments: FilterOption[];
  makes: FilterOption[];
  /** Without the handlers the panel is uncontrolled (static preview). */
  onTextChange?: (field: "query" | "priceMin" | "priceMax", value: string) => void;
  onTransmissionChange?: (value: string) => void;
  onToggle?: (group: FilterGroupKey, value: string, checked: boolean) => void;
  className?: string;
}) {
  const text = (field: "query" | "priceMin" | "priceMax", value: string) =>
    onTextChange
      ? {
          value,
          onChange: (event: { target: { value: string } }) =>
            onTextChange(field, event.target.value),
        }
      : { defaultValue: value };
  const check = (group: FilterGroupKey, option: FilterOption) => ({
    name: `${idPrefix}-${group}`,
    value: option.value,
    disabled: option.disabled,
    count: option.count,
    ...(onToggle
      ? {
          checked: Boolean(option.selected),
          onChange: (checked: boolean) => onToggle(group, option.value, checked),
        }
      : { defaultChecked: Boolean(option.selected) }),
  });

  return (
    <div className={cn("space-y-6", className)}>
      <TextField
        id={`${idPrefix}-q`}
        name="q"
        label={labels.query}
        placeholder={labels.queryPlaceholder}
        leadingIcon="search"
        {...text("query", query)}
      />

      <Group legend={labels.price}>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id={`${idPrefix}-pmin`}
            name="pmin"
            label={labels.priceMin}
            unit={labels.priceUnit}
            aria-invalid={priceError ? true : undefined}
            {...text("priceMin", priceMin)}
          />
          <NumberField
            id={`${idPrefix}-pmax`}
            name="pmax"
            label={labels.priceMax}
            unit={labels.priceUnit}
            aria-invalid={priceError ? true : undefined}
            {...text("priceMax", priceMax)}
          />
        </div>
        {priceError && (
          <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
            <Icon name="alert" size={16} className="mt-0.5" />
            <span>{priceError}</span>
          </p>
        )}
      </Group>

      <Group legend={labels.body}>
        <div className="flex flex-wrap gap-2">
          {bodyTypes.map((option) => (
            <FilterChip key={option.value} {...check("body", option)}>
              {option.label}
            </FilterChip>
          ))}
        </div>
      </Group>

      <Group legend={labels.fuel}>
        <div className="flex flex-wrap gap-2">
          {fuelTypes.map((option) => (
            <FilterChip key={option.value} {...check("fuel", option)}>
              {option.label}
            </FilterChip>
          ))}
        </div>
      </Group>

      <SegmentedSwitch
        name={`${idPrefix}-gear`}
        legend={labels.transmission}
        hideLegend={false}
        fullWidth
        options={[
          { value: "", label: labels.transmissionAny },
          { value: "manual", label: labels.transmissionManual },
          { value: "automatic", label: labels.transmissionAutomatic },
        ]}
        {...(onTransmissionChange
          ? { value: transmission, onChange: onTransmissionChange }
          : { defaultValue: transmission })}
        className="[&_legend]:font-semibold"
      />

      <Group legend={labels.segment}>
        <div className="flex flex-wrap gap-2">
          {segments.map((option) => (
            <FilterChip key={option.value} {...check("segment", option)}>
              {option.label}
            </FilterChip>
          ))}
        </div>
      </Group>

      <Group legend={labels.make}>
        <div
          className="relative max-h-64 overflow-y-auto overscroll-contain rounded-md border border-line bg-surface p-1"
        >
          {makes.map((option) => (
            <CheckboxRow key={option.value} {...check("make", option)}>
              {option.label}
            </CheckboxRow>
          ))}
        </div>
      </Group>
    </div>
  );
}

/** Row of removable chips for the filters that are on, with "clear all". */
export function ActiveFilters({
  items,
  labels,
  onRemove,
  onClear,
  className,
}: {
  items: { key: string; label: string }[];
  labels: {
    /** Accessible name of the list: "Włączone filtry". */
    list: string;
    /** "Usuń filtr" (the filter label is appended). */
    remove: string;
    /** "Wyczyść filtry" */
    clear: string;
  };
  onRemove?: (key: string) => void;
  onClear?: () => void;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ul role="list" aria-label={labels.list} className="contents">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              aria-label={`${labels.remove}: ${item.label}`}
              onClick={onRemove ? () => onRemove(item.key) : undefined}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full pointer-coarse:min-h-11 border border-brand bg-brand-tint pr-2 pl-3 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:bg-brand-soft"
            >
              {item.label}
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex min-h-9 items-center rounded-sm px-1 pointer-coarse:min-h-11 text-sm font-semibold text-brand underline decoration-1 underline-offset-[3px] hover:text-brand-strong hover:decoration-2"
      >
        {labels.clear}
      </button>
    </div>
  );
}

/**
 * "Wyczyść filtry" at the top of the filter panel: in the heading row of the
 * sidebar (FiltersHeading) and in the header of the filters sheet (Sheet
 * `headerAction`). Text button, size sm.
 *
 * It is always rendered. With no filter on it keeps its place in the disabled
 * look and stays focusable with aria-disabled (as a full CompareToggle does), so
 * after a click the focus stays on it instead of falling to <body>, and the
 * panel never shifts. `status` fills a polite live region next to the button:
 * set it to "Filtry wyczyszczone" after clearing, back to "" on the next change.
 */
export function ClearFiltersButton({
  label,
  active,
  status = "",
  onClear,
  demo,
  className,
}: {
  /** "Wyczyść filtry" */
  label: string;
  /** At least one filter (make, segment, body, fuel, gear, pmin, pmax, q) is on. */
  active: boolean;
  /** Announced text, "" when there is nothing to announce. */
  status?: string;
  onClear?: () => void;
  /** Preview only. */
  demo?: "hover" | "focus" | "active";
  className?: string;
}) {
  return (
    <span data-clear-filters className={cn("inline-flex", className)}>
      <button
        type="button"
        aria-disabled={active ? undefined : true}
        onClick={active ? onClear : undefined}
        data-demo={demo}
        className={buttonClass({ variant: "text", size: "sm", disabled: !active })}
      >
        {label}
      </button>
      <span role="status" className="sr-only">
        {status}
      </span>
    </span>
  );
}

/**
 * Heading row of the filters sidebar (from 1024 px): the h2 "Filtry" left and
 * the clear button right, on one 28 px line. The button's side padding hangs
 * outside the panel's content edge, so its text lines up with the fields below.
 */
export function FiltersHeading({
  title,
  action,
  className,
}: {
  /** "Filtry" */
  title: string;
  /** Normally <ClearFiltersButton>. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {action && <div className="-my-1 -mr-1 shrink-0">{action}</div>}
    </div>
  );
}
