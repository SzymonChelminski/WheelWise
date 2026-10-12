import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { fontVariables } from "@/components/ui/fonts";
import { routing } from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={fontVariables}>
      <body className="bg-ground font-sans text-base text-ink antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
