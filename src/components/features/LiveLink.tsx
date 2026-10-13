"use client";

import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { useIntendedQuery } from "@/lib/state/intended-query";
import { resolveTarget, type LinkTarget } from "./link-target";

/*
 * A link whose address depends on the state of the page. The address follows the intended
 * query, so it is already right while a navigation is still loading; the server renders
 * it for the query of the request, so the link also works without JavaScript.
 */
export function LiveLink({
  to,
  ...rest
}: { to: LinkTarget } & Omit<ComponentProps<typeof Link>, "href">) {
  const intended = useIntendedQuery();
  return <Link href={resolveTarget(to, intended)} {...rest} />;
}
