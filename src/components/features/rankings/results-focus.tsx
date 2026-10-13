"use client";

import { useEffect, type MouseEvent } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { isPlainPrimaryClick, useIntendedQuery } from "@/lib/state/intended-query";
import { resolveTarget, type LinkTarget } from "../link-target";

/*
 * Keyboard focus on the rankings page. An action there can remove the control
 * that has focus (a filter chip, the "clear filters" button, the "show more" link
 * once every row is shown). The browser then drops focus to <body>; so the action
 * names a target, and the target gets focus once what the action changes has arrived:
 * the controls (they follow the intended query at once) or the list (it follows the
 * address the router has applied).
 */
export const RESULTS_HEADING_ID = "ranking-title";

const ROWS = `section[aria-labelledby="${RESULTS_HEADING_ID}"] ol > li`;
const CHIPS = "[data-active-filters] ul button";

type Target = () => HTMLElement | null;
type Source = "controls" | "list";

// What each part of the page shows now; it changes whenever the query it was made for changes.
const shown: Record<Source, string> = { controls: "", list: "" };
let waiting: { source: Source; from: string; target: Target } | null = null;

/** Focus goes to `target()` once `source` is replaced, unless the user has moved focus meanwhile. */
function focusAfterUpdate(source: Source, target: Target): void {
  waiting = { source, from: shown[source], target };
}

/** Called by the part of the page that `source` names whenever its `signature` changes. */
export function settleFocus(source: Source, signature: string): void {
  shown[source] = signature;
  if (!waiting || waiting.source !== source || waiting.from === signature) return;
  const { target } = waiting;
  waiting = null;
  const active = document.activeElement;
  if (active && active !== document.body) return;
  target()?.focus();
}

/*
 * After a client-side language switch the previous page stays in the document, hidden.
 * Every lookup is limited to the elements of the page that is rendered now: an element
 * inside a `display: none` subtree has no boxes, in every browser.
 */
export function rendered(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.getClientRects().length > 0,
  );
}

const heading: Target = () => rendered(`#${RESULTS_HEADING_ID}`)[0] ?? null;

export function focusHeadingAfterUpdate(): void {
  focusAfterUpdate("controls", heading);
}

/** After the chip at `index` is removed: the chip that took its place, the last one, or the heading. */
export function focusChipAfterUpdate(index: number): void {
  focusAfterUpdate("controls", () => {
    const chips = rendered(CHIPS);
    return chips.length > 0 ? chips[Math.min(index, chips.length - 1)] : heading();
  });
}

/** After more rows are added: the first of them. */
function focusNewRowAfterUpdate(): void {
  const before = rendered(ROWS).length;
  focusAfterUpdate("list", () => rendered(ROWS)[before]?.querySelector<HTMLElement>("a[href]") ?? heading());
}

/** Renders nothing; `signature` changes with the list (the query string it was made for). */
export function ResultsFocus({ signature }: { signature: string }) {
  useEffect(() => settleFocus("list", signature), [signature]);
  return null;
}

/** A link that replaces the list ("clear filters", "show more") and keeps keyboard focus on the page. */
export function ResultsLink({
  to,
  focus,
  replace,
  children,
}: {
  to: LinkTarget;
  focus: "heading" | "new-rows";
  replace?: boolean;
  children: React.ReactNode;
}) {
  const intended = useIntendedQuery();

  // A click that opens the link elsewhere (a new tab, a download) changes nothing here.
  function onClick(event: MouseEvent) {
    if (!isPlainPrimaryClick(event)) return;
    if (focus === "heading") focusAfterUpdate("list", heading);
    else focusNewRowAfterUpdate();
  }

  return (
    <ButtonLink
      variant="secondary"
      href={resolveTarget(to, intended)}
      replace={replace}
      scroll={replace ? false : undefined}
      data-history={replace ? "replace" : undefined}
      onClick={onClick}
    >
      {children}
    </ButtonLink>
  );
}
