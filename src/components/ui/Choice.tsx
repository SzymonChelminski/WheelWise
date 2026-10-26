import type { ChangeEventHandler, ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./Icon";

/*
 * Choice controls built on native inputs: segmented switch (radio group),
 * filter chip (checkbox) and checkbox row. Native inputs keep keyboard
 * behaviour and form semantics for free.
 *
 * The input of a switch segment or a chip is invisible and covers its label
 * exactly (HIDDEN_INPUT inside a "relative" label). Its box is therefore the
 * box of the control: it scrolls with the control in any scroll container,
 * and when it receives focus the browser brings the whole control into view.
 * Do not replace it with "sr-only": that takes the input out of the label's
 * box and makes the nearest positioned ancestor scroll instead.
 */

const HIDDEN_INPUT =
  "absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed";

const FOCUS_WITHIN =
  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-(--focus-ring)";

export interface SegmentedOption {
  value: string;
  label: string;
  /** Preview only: shows a state of this segment without a pointer or keyboard. */
  demo?: "hover" | "focus";
}

export function SegmentedSwitch({
  name,
  legend,
  hideLegend = true,
  options,
  value,
  defaultValue,
  onChange,
  fullWidth = false,
  className,
}: {
  /** Radio group name, unique on the page. */
  name: string;
  legend: string;
  hideLegend?: boolean;
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /**
   * true: equal columns at every width. "narrow": equal columns over the whole
   * row below 640 px, its own width from 640 px (the order switch on the rankings page).
   */
  fullWidth?: boolean | "narrow";
  className?: string;
}) {
  // No handler object at all when uncontrolled: the component then also works in a Server Component.
  const handle: ChangeEventHandler<HTMLInputElement> | undefined = onChange
    ? (event) => onChange(event.target.value)
    : undefined;
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend
        className={hideLegend ? "sr-only" : "mb-1.5 text-sm font-medium text-ink"}
      >
        {legend}
      </legend>
      <div
        className={cn(
          "rounded-md border border-line-strong bg-surface p-[3px]",
          fullWidth === "narrow" ? "flex sm:inline-flex" : fullWidth ? "flex" : "inline-flex",
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            data-demo={option.demo}
            className={cn(
              "relative flex min-h-9 cursor-pointer items-center justify-center rounded-sm text-center text-sm font-medium text-ink transition-colors duration-(--duration-fast)",
              "hover:bg-brand-soft has-[:checked]:bg-brand has-[:checked]:font-semibold has-[:checked]:text-on-brand",
              FOCUS_WITHIN,
              "has-[:focus-visible]:outline-offset-2",
              fullWidth === "narrow"
                ? "flex-1 px-2 sm:flex-none sm:px-3.5"
                : fullWidth
                  ? "flex-1 px-2"
                  : "px-3.5",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              className={HIDDEN_INPUT}
              {...(value !== undefined
                ? { checked: value === option.value, onChange: handle }
                : { defaultChecked: defaultValue === option.value, onChange: handle })}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface CheckProps {
  name: string;
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  children: ReactNode;
  /** Number of cars behind the option, shown after the label. */
  count?: string;
  /** Preview only. */
  demo?: "hover" | "focus";
}

function inputState({ checked, defaultChecked, onChange }: CheckProps) {
  const handle: ChangeEventHandler<HTMLInputElement> | undefined = onChange
    ? (event) => onChange(event.target.checked)
    : undefined;
  return checked !== undefined
    ? { checked, onChange: handle }
    : { defaultChecked, onChange: handle };
}

/** Filter chip: a checkbox drawn as a pill. Active = tinted, ruled and ticked. */
export function FilterChip(props: CheckProps) {
  const { name, value, disabled, children, count, demo } = props;
  return (
    <label
      data-demo={demo}
      className={cn(
        "relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full pointer-coarse:min-h-11 border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink transition-colors duration-(--duration-fast)",
        "hover:border-brand hover:bg-brand-soft",
        "has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:shadow-[inset_0_0_0_1px_var(--color-brand)]",
        FOCUS_WITHIN,
        "has-[:focus-visible]:outline-offset-2",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:border-line has-[:disabled]:bg-sunken has-[:disabled]:text-ink-muted",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        disabled={disabled}
        className={cn("peer", HIDDEN_INPUT)}
        {...inputState(props)}
      />
      <Icon
        name="check"
        size={16}
        className="-ml-1 hidden text-brand-strong peer-checked:block"
      />
      {children}
      {count !== undefined && (
        <span className="font-normal text-ink-muted tabular-nums">{count}</span>
      )}
    </label>
  );
}

/** Checkbox with a label on one 40 px row; used for long option lists (makes). */
export function CheckboxRow(props: CheckProps) {
  const { name, value, disabled, children, count } = props;
  return (
    <label
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-3 rounded-sm pointer-coarse:min-h-11 px-2 text-sm text-ink transition-colors duration-(--duration-fast)",
        "hover:bg-brand-soft has-[:checked]:font-semibold",
        FOCUS_WITHIN,
        "has-[:focus-visible]:-outline-offset-3",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:text-ink-muted",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        disabled={disabled}
        className="size-5 shrink-0 scroll-my-3 accent-brand outline-none"
        {...inputState(props)}
      />
      <span className="min-w-0 flex-1 break-words">{children}</span>
      {count !== undefined && (
        <span className="font-normal text-ink-muted tabular-nums">{count}</span>
      )}
    </label>
  );
}
