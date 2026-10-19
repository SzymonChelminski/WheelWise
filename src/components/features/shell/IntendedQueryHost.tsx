"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
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
  // Not on the first render: this component can hydrate after the page's restore of the stored
  // assumptions has already set the intended query, and the address it is about to show is not
  // applied yet. The intended query reads the browser's address on its own the first time.
  const previousPathname = useRef(pathname);
  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    resyncIntendedQuery();
  }, [pathname]);
  useEffect(() => noteCommittedQuery(committed), [committed]);
  useEffect(() => watchNavigation(), []);

  return null;
}
