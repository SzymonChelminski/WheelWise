import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";
import { fieldLabelClass } from "./styles";

/*
 * Form fields. The visible box is a wrapper with class "field-box": it carries
 * the border and, through :focus-within, the focus ring (see globals.css).
 */

const BOX =
  "field-box flex h-11 items-center rounded-md border bg-surface transition-colors duration-(--duration-fast)";
const BOX_OK = "border-line-strong hover:border-brand";
const BOX_INVALID = "border-danger shadow-[inset_0_0_0_1px_var(--color-danger)]";
const BOX_DISABLED = "border-line bg-sunken text-ink-muted";

function FieldMessage({
  id,
  error,
  hint,
}: {
  id: string;
  error?: string;
  hint?: string;
}) {
  if (error) {
    return (
      <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
        <Icon name="alert" size={16} className="mt-0.5" />
        <span>{error}</span>
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="mt-1.5 text-xs text-ink-muted">
        {hint}
      </p>
    );
  }
  return null;
}

interface FieldProps {
  /** Unique id of the control; label, hint and error ids derive from it. */
  id: string;
  label: string;
  /** Hides the label visually; it stays available to assistive technology. */
  hideLabel?: boolean;
  hint?: string;
  /** Error text: what is wrong and which values are accepted. Marks the field invalid. */
  error?: string;
  className?: string;
  /** Preview only: "focus" shows the focus ring without keyboard focus. */
  demo?: "focus";
}

export type TextFieldProps = FieldProps & {
  leadingIcon?: IconName;
  /** Unit shown inside the field on the right: "km", "zł". */
  unit?: string;
  /** Whole numbers: numeric keyboard on touch devices, tabular figures. */
  numeric?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">;

export function TextField({
  id,
  label,
  hideLabel,
  hint,
  error,
  className,
  demo,
  leadingIcon,
  unit,
  numeric = false,
  disabled,
  ...rest
}: TextFieldProps) {
  const messageId = `${id}-message`;
  const unitId = `${id}-unit`;
  const describedBy = cn(unit && unitId, (error || hint) && messageId) || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : fieldLabelClass}>
        {label}
      </label>
      <div
        data-demo={demo}
        className={cn(
          BOX,
          !hideLabel && "mt-1.5",
          disabled ? BOX_DISABLED : error ? BOX_INVALID : BOX_OK,
        )}
      >
        {leadingIcon && <Icon name={leadingIcon} className="ml-3 text-ink-muted" />}
        <input
          id={id}
          type="text"
          inputMode={numeric ? "numeric" : undefined}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-full min-w-0 flex-1 rounded-md bg-transparent px-3 text-base text-ink placeholder:text-ink-muted disabled:cursor-not-allowed",
            numeric && "tabular-nums",
          )}
          {...rest}
        />
        {unit && (
          <span id={unitId} className="pr-3 text-sm text-ink-muted">
            {unit}
          </span>
        )}
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}

/** Numeric input with a unit: TextField with the numeric keyboard and tabular figures. */
export function NumberField(props: Omit<TextFieldProps, "numeric" | "leadingIcon">) {
  return <TextField numeric {...props} />;
}

export function Select({
  id,
  label,
  hideLabel,
  hint,
  error,
  className,
  demo,
  disabled,
  children,
  ...rest
}: FieldProps & { children: ReactNode } & Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "id" | "className"
  >) {
  const messageId = `${id}-message`;
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : fieldLabelClass}>
        {label}
      </label>
      <div
        data-demo={demo}
        className={cn(
          BOX,
          "relative",
          !hideLabel && "mt-1.5",
          disabled ? BOX_DISABLED : error ? BOX_INVALID : BOX_OK,
        )}
      >
        <select
          id={id}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className="h-full w-full min-w-0 cursor-pointer appearance-none truncate rounded-md bg-surface pr-10 pl-3 text-base text-ink disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted"
          {...rest}
        >
          {children}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-3 text-ink-muted"
        />
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}
