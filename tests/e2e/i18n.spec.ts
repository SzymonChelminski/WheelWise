import type { Page } from "@playwright/test";
import { cheapest, nameOf, ranking } from "./helpers/catalogue";
import { expect, expectQuietPage, NOT_FOUND_LINE, test, watchPage } from "./helpers/fixtures";
import { escapeRegExp, integer, LOCALES, msg, type Locale } from "./helpers/text";
import { expectedRow, expectRows, interactive, listTitle, rankingList, visit } from "./helpers/ui";

const car = cheapest((item) => item.fuelType === "hybrid");
const other = cheapest((item) => item.fuelType === "diesel");

/** Every page of the site with the heading it shows. */
function routes(locale: Locale): { path: string; title: string; heading: string }[] {
  return [
    { path: "", title: msg(locale, "meta.home.title"), heading: msg(locale, "home.title") },
    { path: "/rankings", title: msg(locale, "meta.rankings.title"), heading: msg(locale, "rankings.title") },
    {
      path: `/cars/${car.slug}`,
      title: msg(locale, "meta.car.title", { name: nameOf(car) }),
      heading: nameOf(car),
    },
    { path: "/compare", title: msg(locale, "meta.compare.title"), heading: msg(locale, "compare.title") },
    {
      path: `/compare?cars=${car.slug},${other.slug}`,
      title: msg(locale, "meta.compare.title"),
      heading: msg(locale, "compare.title"),
    },
    { path: "/methodology", title: msg(locale, "meta.methodology.title"), heading: msg(locale, "methodology.title") },
  ];
}

/** The address search engines are told to use; the server is configured with it at build time. */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

async function linkTags(page: Page) {
  return page.evaluate(() => ({
    canonical: [...document.head.querySelectorAll('link[rel="canonical"]')].map((link) => link.getAttribute("href")),
    alternates: [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => ({
      lang: link.getAttribute("hreflang"),
      href: link.getAttribute("href"),
    })),
  }));
}

const ACCOUNT_WORDS = /log ?in|sign ?(in|up)|account|register|zaloguj|logowanie|rejestr|konto|załóż/i;

test.describe("languages", () => {
  for (const locale of LOCALES) {
    test(`every page renders in ${locale} with its language, title and heading`, async ({ page }) => {
      for (const route of routes(locale)) {
        await visit(page, `/${locale}${route.path}`);
        await expect(page.locator("html"), route.path).toHaveAttribute("lang", locale);
        await expect(page, route.path).toHaveTitle(route.title);
        await expect(page.getByRole("heading", { level: 1 }), route.path).toHaveText(route.heading);
      }
    });

    test(`every page loads without console errors and without requests to other origins (${locale})`, async ({
      page,
      watch,
    }) => {
      watch.allowConsole(NOT_FOUND_LINE);
      for (const path of [...routes(locale).map((route) => route.path), "/no-such-page"]) {
        await visit(page, `/${locale}${path}`);
        await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
        // Fonts, scripts and styles are served by the site itself.
        const assets = await page.evaluate(() =>
          performance.getEntriesByType("resource").map((entry) => entry.name),
        );
        expect(assets.length, path).toBeGreaterThan(0);
        expect(watch.foreignRequests(), path).toEqual([]);
        expect(watch.consoleErrors(), path).toEqual([]);
      }
    });

    test(`no page offers a login, a sign-up or an account (${locale})`, async ({ page, watch }) => {
      watch.allowConsole(NOT_FOUND_LINE);
      for (const path of [...routes(locale).map((route) => route.path), "/no-such-page"]) {
        await visit(page, `/${locale}${path}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        for (const role of ["link", "button"] as const) {
          await expect(page.getByRole(role, { name: ACCOUNT_WORDS }), `${role} on ${path}`).toHaveCount(0);
        }
        await expect(page.getByRole("textbox", { name: /password|hasło|e-?mail/i }), path).toHaveCount(0);
      }
    });

    test(`every page has one canonical address and language alternates (${locale})`, async ({ page }) => {
      for (const route of routes(locale)) {
        await visit(page, `/${locale}${route.path}`);
        const tags = await linkTags(page);
        const path = route.path.split("?")[0];
        expect(tags.canonical, route.path).toEqual([`${SITE}/${locale}${path}`]);
        expect(
          [...tags.alternates].sort((a, b) => String(a.lang).localeCompare(String(b.lang))),
          route.path,
        ).toEqual([
          { lang: "en", href: `${SITE}/en${path}` },
          { lang: "pl", href: `${SITE}/pl${path}` },
        ]);
      }
    });
  }

  test("the language switcher keeps the path and the query", async ({ page }) => {
    await visit(page, "/pl/rankings?metric=price&fuel=ev");
    const english = page.getByRole("navigation", { name: msg("pl", "header.language") }).getByRole("link", { name: /^EN\b/ });
    await expect(english).toHaveAttribute("lang", "en");
    await expect(english).toHaveAttribute("hreflang", "en");
    await interactive(english);
    await english.click();
    await expect(page).toHaveURL("/en/rankings?metric=price&fuel=ev");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expectRows(
      rankingList(page, listTitle("en", "price")),
      ranking("price", { fuelTypes: ["ev"] })
        .slice(0, 10)
        .map((item) => expectedRow(item, "price", "month", "en")),
    );

    await visit(page, `/en/cars/${car.slug}?km=20000&period=year`);
    const polish = page.getByRole("navigation", { name: msg("en", "header.language") }).getByRole("link", { name: /^PL\b/ });
    await interactive(polish);
    await polish.click();
    await expect(page).toHaveURL(`/pl/cars/${car.slug}?km=20000&period=year`);
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nameOf(car));
  });

  test("the English assumptions summary reads as designed", async ({ page }) => {
    await visit(page, "/en/rankings");
    const summary = `${integer(15000, "en")} km a year, 5 years, OC + AC, driver aged 35–44`;
    // The summary line starts with its label and ends with the age band.
    await expect(page.getByRole("main").getByText(new RegExp(`${escapeRegExp(summary)}$`))).toBeVisible();
  });

  for (const { browserLocale, target } of [
    { browserLocale: "pl-PL", target: "/pl" },
    { browserLocale: "de-DE", target: "/pl" },
    { browserLocale: "en-US", target: "/en" },
  ]) {
    test(`the start address leads a ${browserLocale} browser to ${target}`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, locale: browserLocale });
      const page = await context.newPage();
      const watch = watchPage(page, new URL(baseURL!).origin);
      await page.goto("/");
      await expect(page).toHaveURL(target);
      await expect(page.locator("html")).toHaveAttribute("lang", target.slice(1));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(msg(target.slice(1) as Locale, "home.title"));
      expectQuietPage(watch);
      await context.close();
    });
  }
});
