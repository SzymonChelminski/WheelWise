import { useId, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";
import { Icon } from "./Icon";

/*
 * Add-to-comparison control. A toggle button (aria-pressed):
 *   off      "+ Porównaj"        outlined
 *   on       "✓ W porównaniu"    filled petrol
 *   full     three cars are already chosen and this one is not among them:
 *            disabled look, aria-disabled, still focusable
 *
 * The reason for the full state is always text that everyone can read, never a
 * title attribute:
 *   in a list   the comparison bar prints the reason at every width; pass
 *               describedBy={COMPARE_BAR_HINT_ID} so that the button points to it
 *   alone       (car page) pass showHint: the reason is printed under the button
 * Activating a full toggle adds nothing; the caller then shows the limit
 * message in the comparison bar (CompareBar, prop "notice").
 */
export function CompareToggle({
  pressed,
  labels,
  carName,
  full = false,
  size = "sm",
  describedBy,
  showHint = false,
  className,
  demo,
  ...rest
}: {
  pressed: boolean;
  labels: {
    /** "Porównaj" */
    add: string;
    /** "W porównaniu" */
    added: string;
    /** "Porównanie mieści 3 auta. Usuń jedno, aby dodać kolejne." */
    fullHint: string;
  };
  /** Added to the accessible name so that each button in a list is unique. */
  carName: string;
  /** Three cars are already selected and this one is not among them. */
  full?: boolean;
  size?: "sm" | "md";
  /** Id of a visible text that explains the full state (the comparison bar hint). */
  describedBy?: string;
  /** Print labels.fullHint under the button while it is full. For a toggle that stands alone. */
  showHint?: boolean;
  demo?: "hover" | "focus";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const hintId = useId();
  const disabled = full && !pressed;
  const hintShown = disabled && showHint;
  const button = (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${pressed ? labels.added : labels.add}: ${carName}`}
      aria-disabled={disabled || undefined}
      aria-describedby={disabled ? (hintShown ? hintId : describedBy) : undefined}
      data-demo={demo}
      className={cn(
        "relative z-10 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-semibold whitespace-nowrap transition-colors duration-(--duration-fast)",
        size === "md" ? "min-h-11 px-5 text-base" : "min-h-9 px-3 text-sm pointer-coarse:min-h-11",
        disabled
          ? "cursor-not-allowed border-line bg-sunken text-ink-muted"
          : pressed
            ? "border-brand bg-brand text-on-brand hover:border-brand-strong hover:bg-brand-strong"
            : "border-line-strong bg-surface text-ink hover:border-brand hover:bg-brand-soft active:bg-brand-tint",
        !hintShown && className,
      )}
      {...rest}
    >
      <Icon name={pressed ? "check" : "plus"} size={size === "md" ? 20 : 16} />
      {pressed ? labels.added : labels.add}
    </button>
  );
  if (!hintShown) return button;
  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      {button}
      <p id={hintId} className="flex max-w-md items-start gap-1.5 text-sm text-ink-muted">
        <Icon name="info" size={16} className="mt-0.5 shrink-0" />
        <span>{labels.fullHint}</span>
      </p>
    </div>
  );
}
