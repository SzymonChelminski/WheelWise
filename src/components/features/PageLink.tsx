import { Suspense, type ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { LiveLink } from "./LiveLink";
import { resolveTarget, type LinkTarget } from "./link-target";

/*
 * A LiveLink that may stand outside a Suspense boundary of its own page: until the query of
 * the page is known it points to the target without parameters. Used by links on pages that
 * are otherwise static (not found, error, back links).
 */
export function PageLink({
  to,
  ...rest
}: { to: LinkTarget } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Suspense fallback={<Link href={resolveTarget(to, "")} {...rest} />}>
      <LiveLink to={to} {...rest} />
    </Suspense>
  );
}
