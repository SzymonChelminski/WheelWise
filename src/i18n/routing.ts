import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pl", "en"],
  defaultLocale: "pl",
  localePrefix: "always",
  // The proxy would write a Link header from the request host; the HTML alternates name the configured site address.
  alternateLinks: false,
});
