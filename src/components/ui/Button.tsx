import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "text" | "signal";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold select-none transition-colors duration-(--duration-fast)";

const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 py-2 text-base",
  sm: "min-h-9 px-3 py-1.5 text-sm pointer-coarse:min-h-11",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-strong active:bg-brand-deep",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-brand hover:bg-brand-soft active:bg-brand-tint",
  text: "text-brand underline decoration-1 underline-offset-[3px] hover:text-brand-strong hover:decoration-2 active:text-brand-deep",
  signal: "bg-signal text-on-signal hover:bg-signal-strong active:bg-signal-strong",
};

const DISABLED: Record<ButtonVariant, string> = {
  primary: "bg-sunken text-ink-muted cursor-not-allowed",
  secondary: "border border-line bg-sunken text-ink-muted cursor-not-allowed",
  text: "text-ink-muted cursor-not-allowed",
  signal: "bg-brand-strong text-on-brand-muted cursor-not-allowed",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  disabled = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
} = {}): string {
  return cn(
    BASE,
    SIZES[size],
    variant === "text" && (size === "md" ? "!px-2" : "!px-1"),
    disabled ? DISABLED[variant] : VARIANTS[variant],
    className,
  );
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  icon,
  loading = false,
  disabled = false,
  className,
  children,
  type = "button",
  demo,
  ...rest
}: CommonProps & {
  /** An action is running: spinner instead of the icon, aria-busy, still focusable. */
  loading?: boolean;
  /** Preview only: shows a state without a pointer or keyboard. */
  demo?: "hover" | "focus" | "active";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const iconSize = size === "sm" ? 16 : 20;
  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      data-demo={demo}
      className={buttonClass({ variant, size, disabled, className })}
      {...rest}
    >
      {loading ? (
        <Icon name="refresh" size={iconSize} className="animate-spin" />
      ) : (
        icon && <Icon name={icon} size={iconSize} />
      )}
      {children}
    </button>
  );
}

/** A link that looks like a button. Use it for navigation, Button for actions. */
export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 20} />}
      {children}
    </Link>
  );
}
