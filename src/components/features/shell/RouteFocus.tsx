"use client";

import { useLayoutEffect, useRef } from "react";
import { rendered } from "@/components/features/rankings/results-focus";
import { usePathname } from "@/i18n/navigation";

/*
 * After a client-side change of page the element that had focus is gone (or hidden with the
 * previous page) and the browser leaves focus on <body>, so the next Tab would start at the
 * footer. Focus goes to the heading of the new page instead (WCAG 2.4.3). The path is read
 * without the locale prefix: the language switch keeps its own focus handling, and a query-only
 * change never changes the path.
 */
function focusIsLost(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || !active.isConnected || active.getClientRects().length === 0;
}

function focusPage(): void {
  if (!focusIsLost()) return;
  const target = rendered("main h1")[0] ?? rendered("main")[0];
  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

/** Renders nothing. Mounted once, in the layout. */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  // Before paint: the new page is never visible with focus still on <body>.
  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    focusPage();
  }, [pathname]);

  return null;
}
