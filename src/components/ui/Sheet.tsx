"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";
import { Icon, type IconName } from "./Icon";

/*
 * Sheet: a modal <dialog>. Bottom sheet below 768 px, right-hand drawer from
 * 768 px (styles: .sheet in globals.css). The native dialog gives the focus
 * trap, Escape to close and focus return to the trigger.
 */
export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Accessible name of the close button: "Zamknij". */
  closeLabel: string;
  children: ReactNode;
  /** Pinned under the scrolling content, usually the apply button. */
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line py-2 pr-2 pl-5">
        <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
          {title}
        </h2>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="inline-flex size-11 items-center justify-center rounded-md text-ink transition-colors duration-(--duration-fast) hover:bg-brand-soft"
        >
          <Icon name="close" size={24} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        {children}
      </div>
      {footer && (
        <footer className="shrink-0 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {footer}
        </footer>
      )}
    </dialog>
  );
}

/** A button that opens a Sheet. Keeps only the open / closed state. */
export function SheetDisclosure({
  triggerLabel,
  triggerIcon,
  triggerVariant = "secondary",
  triggerSize = "md",
  badge,
  title,
  closeLabel,
  applyLabel,
  children,
  defaultOpen = false,
  className,
}: {
  triggerLabel: string;
  triggerIcon?: IconName;
  triggerVariant?: ButtonVariant;
  triggerSize?: "md" | "sm";
  /** Count shown on the trigger, e.g. the number of active filters. */
  badge?: string;
  title: string;
  closeLabel: string;
  /** Label of the full-width button in the footer that closes the sheet: "Pokaż 128 aut". */
  applyLabel?: string;
  children: ReactNode;
  /** Preview only. */
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        icon={triggerIcon}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={className}
      >
        {triggerLabel}
        {badge && (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs leading-6 font-semibold text-on-brand tabular-nums">
            {badge}
          </span>
        )}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        closeLabel={closeLabel}
        footer={
          applyLabel ? (
            <Button className="w-full" onClick={() => setOpen(false)}>
              {applyLabel}
            </Button>
          ) : undefined
        }
      >
        {children}
      </Sheet>
    </>
  );
}
