"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/SiteShell";
import { usePathname } from "@/i18n/navigation";
import { pickAssumptionParams } from "@/lib/state/assumption-params";
import { useCompare } from "@/lib/state/compare-client";
import { useIntendedQuery } from "@/lib/state/intended-query";
import { footerLabels, footerNav } from "./nav";

/** The page footer, with links that keep the assumption parameters of the intended query. */
export function SiteFooter({ children }: { children?: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const intended = useIntendedQuery();
  const { slugs } = useCompare();

  const query = pickAssumptionParams(new URLSearchParams(intended)).toString();

  return (
    <Footer nav={footerNav(t, { pathname, query, compareSlugs: slugs })} labels={footerLabels(t)}>
      {children}
    </Footer>
  );
}
