import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

/** Localised title, description and the links between the language versions of a page. */
export async function pageMetadata(
  localeParam: string,
  key: "home" | "rankings",
  path: string,
): Promise<Metadata> {
  if (!hasLocale(routing.locales, localeParam)) notFound();
  const t = await getTranslations({ locale: localeParam, namespace: `meta.${key}` });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${localeParam}${path}`,
      languages: Object.fromEntries(routing.locales.map((locale) => [locale, `/${locale}${path}`])),
    },
  };
}
