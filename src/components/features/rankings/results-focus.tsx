"use client";

import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/Button";

/*
 * Keyboard focus on the rankings page. An action there can remove the control
 * that has focus (a filter chip, the "clear filters" button, the "show more" link
 * once every row is shown). The browser then drops focus to <body>; so the action
 * names a target, and the target gets focus when the page for the new URL arrives.
 */
export const RESULTS_HEADING_ID = "ranking-title";

const ROWS = `section[aria-labelledby="${RESULTS_HEADING_ID}"] ol > li`;
const CHIPS = "[data-active-filters] ul button";

type Target = () => HTMLElement | null;

// Identifies the list on screen; it changes whenever the URL it was made for changes.
let shown = "";
let waiting: { from: string; target: Target } | null = null;

/** Focus goes to `target()` once the list is replaced, unless the user has moved focus meanwhile. */
function focusAfterUpdate(target: Target): void {
  waiting = { from: shown, target };
}

const heading: Target = () => document.getElementById(RESULTS_HEADING_ID);

export function focusHeadingAfterUpdate(): void {
  focusAfterUpdate(heading);
}

/** After the chip at `index` is removed: the chip that took its place, the last one, or the heading. */
export function focusChipAfterUpdate(index: number): void {
  focusAfterUpdate(() => {
    const chips = document.querySelectorAll<HTMLElement>(CHIPS);
    return chips.length > 0 ? chips[Math.min(index, chips.length - 1)] : heading();
  });
}

/** After more rows are added: the first of them. */
function focusNewRowAfterUpdate(): void {
  const before = document.querySelectorAll(ROWS).length;
  focusAfterUpdate(() => document.querySelectorAll(ROWS)[before]?.querySelector<HTMLElement>("a[href]") ?? heading());
}

/** Renders nothing; `signature` changes with the list (for example the query string it was made for). */
export function ResultsFocus({ signature }: { signature: string }) {
  useEffect(() => {
    shown = signature;
    if (!waiting || waiting.from === signature) return;
    const { target } = waiting;
    waiting = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    target()?.focus();
  }, [signature]);
  return null;
}

/** A link that replaces the list ("clear filters", "show more") and keeps keyboard focus on the page. */
export function ResultsLink({
  href,
  focus,
  replace,
  children,
}: {
  href: string;
  focus: "heading" | "new-rows";
  replace?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ButtonLink
      variant="secondary"
      href={href}
      replace={replace}
      scroll={replace ? false : undefined}
      onClick={() => (focus === "heading" ? focusHeadingAfterUpdate() : focusNewRowAfterUpdate())}
    >
      {children}
    </ButtonLink>
  );
}
