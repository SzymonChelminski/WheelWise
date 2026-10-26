import { SegmentedSwitch } from "./Choice";
import { cn } from "./cn";

/*
 * Order of the ranking: lowest value first (default) or highest value first.
 * A two-option radio group drawn as the segmented switch, so it reads and works
 * like the month / year switch next to it. The labels name the direction of the
 * value, not of the cost, so they fit every metric (amounts and consumption).
 *
 * Below 640 px it takes a row of its own with two equal halves; from 640 px it
 * is as wide as its labels and sits beside the period switch.
 */
export type SortDirection = "asc" | "desc";

export interface SortDirectionLabels {
  /** Hidden legend of the radio group: "Kolejność". */
  legend: string;
  /** "Od najniższej" */
  asc: string;
  /** "Od najwyższej" */
  desc: string;
}

export function SortDirectionSwitch({
  name = "dir",
  labels,
  value,
  defaultValue = "asc",
  onChange,
  demo,
  className,
}: {
  /** Radio group name, unique on the page. */
  name?: string;
  labels: SortDirectionLabels;
  /** Controlled value; without it the switch is uncontrolled (static preview). */
  value?: SortDirection;
  defaultValue?: SortDirection;
  onChange?: (value: SortDirection) => void;
  /** Preview only: shows a state of one segment without a pointer or keyboard. */
  demo?: { segment: SortDirection; state: "hover" | "focus" };
  className?: string;
}) {
  const options = (["asc", "desc"] as const).map((key) => ({
    value: key,
    label: labels[key],
    demo: demo?.segment === key ? demo.state : undefined,
  }));
  return (
    <SegmentedSwitch
      name={name}
      legend={labels.legend}
      options={options}
      fullWidth="narrow"
      className={cn("w-full sm:w-auto", className)}
      {...(onChange
        ? { value, onChange: (next: string) => onChange(next === "desc" ? "desc" : "asc") }
        : { defaultValue: value ?? defaultValue })}
    />
  );
}
