import type { Page } from "@playwright/test";
import { expect, expectQuietPage, NOT_FOUND_LINE, test, watchPage } from "./helpers/fixtures";
import { msg, type Locale } from "./helpers/text";

async function expectNotFoundPage(page: Page, locale: Locale) {
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(msg(locale, "notFound.title"));
  await expect(page).toHaveTitle(msg(locale, "meta.notFound.title"));
  const main = page.getByRole("main");
  await expect(main.getByText(msg(locale, "notFound.text"))).toBeVisible();
  await expect(main.getByRole("link", { name: msg(locale, "common.home"), exact: true })).toHaveAttribute(
    "href",
    `/${locale}`,
  );
  await expect(main.getByRole("link", { name: msg(locale, "notFound.toRankings"), exact: true })).toHaveAttribute(
    "href",
    `/${locale}/rankings`,
  );
}

test.describe("missing pages", () => {
  for (const [locale, path] of [
    ["pl", "/pl/cars/no-such-car-99km"],
    ["en", "/en/cars/no-such-car-99km"],
    // The former address of the Renault Clio diesel: old addresses are not redirected.
    ["pl", "/pl/cars/renault-clio-sedan-hatchback-diesel-manual-74kw"],
    ["en", "/en/cars/renault-clio-sedan-hatchback-diesel-manual-74kw"],
    ["pl", "/pl/no/such/page"],
    ["en", "/en/no-such-page"],
  ] as const) {
    test(`${path} answers 404 with the ${locale} not-found page`, async ({ page, watch }) => {
      watch.allowConsole(NOT_FOUND_LINE);
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page).toHaveURL(path);
      await expectNotFoundPage(page, locale);
    });
  }

  test("the home link of the not-found page leads home", async ({ page, watch }) => {
    watch.allowConsole(NOT_FOUND_LINE);
    await page.goto("/pl/no-such-page");
    const home = page.getByRole("main").getByRole("link", { name: msg("pl", "common.home"), exact: true });
    await home.click();
    await expect(page).toHaveURL("/pl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(msg("pl", "home.title"));
  });

  for (const { browserLocale, target, locale } of [
    { browserLocale: "pl-PL", target: "/pl/de", locale: "pl" as const },
    { browserLocale: "de-DE", target: "/pl/de", locale: "pl" as const },
    { browserLocale: "en-US", target: "/en/de", locale: "en" as const },
  ]) {
    test(`a path without a language leads a ${browserLocale} browser to the ${locale} not-found page`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({ baseURL, locale: browserLocale });
      const page = await context.newPage();
      const watch = watchPage(page, new URL(baseURL!).origin);
      watch.allowConsole(NOT_FOUND_LINE);
      const response = await page.goto("/de");
      expect(response?.status()).toBe(404);
      await expect(page).toHaveURL(target);
      await expectNotFoundPage(page, locale);
      expectQuietPage(watch);
      await context.close();
    });
  }
});

test.describe("response headers", () => {
  for (const { path, status } of [
    { path: "/pl", status: 200 },
    { path: "/en/rankings?fuel=ev", status: 200 },
    { path: "/pl/does-not-exist", status: 404 },
    { path: "/pl/cars/no-such-car-99km", status: 404 },
    { path: "/api/cron/daily", status: 401 },
  ]) {
    test(`${path} carries the security headers`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(status);
      const headers = response.headers();
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(headers["permissions-policy"]).toBeTruthy();
      expect(headers["x-powered-by"]).toBeUndefined();
    });
  }
});
