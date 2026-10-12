"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/SiteShell";
import { usePathname } from "@/i18n/navigation";
import { pickAssumptionParams } from "@/lib/state/assumption-params";
import { useCompare } from "@/lib/state/compare-client";
import { footerLabels, footerNav } from "./nav";

/** The page footer, with links that keep the assumption parameters. */
export function SiteFooter({ children }: { children?: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { slugs } = useCompare();

  const query = pickAssumptionParams(new URLSearchParams(searchParams)).toString();

  return (
    <Footer nav={footerNav(t, { pathname, query, compareSlugs: slugs })} labels={footerLabels(t)}>
      {children}
    </Footer>
  );
}
