"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import {
  noteCommittedQuery,
  resyncIntendedQuery,
  watchNavigation,
} from "@/lib/state/intended-query";

/** Renders nothing. Keeps the intended query in step with the browser; mounted once, in the layout. */
export function IntendedQueryHost() {
  // With the locale prefix, so the query is also read again when the language changes.
  const pathname = usePathname();
  const committed = useSearchParams().toString();

  // Before the new page is painted, so no link on it shows the query of the page before.
  useLayoutEffect(() => resyncIntendedQuery(), [pathname]);
  useEffect(() => noteCommittedQuery(committed), [committed]);
  useEffect(() => watchNavigation(), []);

  return null;
}
