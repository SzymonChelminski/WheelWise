import { test as base, expect, type Page } from "@playwright/test";

/*
 * Every test page is watched: an error written to the browser console, an
 * uncaught exception, or a request to any origin other than the site's own
 * fails the test. A test that deliberately opens a missing page allows the
 * browser's own "404" line with `allowConsole`.
 */

export interface PageWatch {
  /** Console errors that match the pattern are expected and not reported. */
  allowConsole(pattern: RegExp): void;
  consoleErrors(): string[];
  foreignRequests(): string[];
}

export function watchPage(page: Page, siteOrigin: string): PageWatch {
  const errors: string[] = [];
  const foreign: string[] = [];
  const allowed: RegExp[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(`uncaught: ${error.message}`));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.origin !== siteOrigin) foreign.push(request.url());
  });

  return {
    allowConsole: (pattern) => allowed.push(pattern),
    consoleErrors: () => errors.filter((text) => !allowed.some((pattern) => pattern.test(text))),
    foreignRequests: () => [...foreign],
  };
}

/** The line the browser logs when a document or resource answers 404. */
export const NOT_FOUND_LINE = /the server responded with a status of 404/;

export function expectQuietPage(watch: PageWatch): void {
  expect(watch.foreignRequests(), "requests to other origins").toEqual([]);
  expect(watch.consoleErrors(), "errors in the browser console").toEqual([]);
}

export const test = base.extend<{ watch: PageWatch }>({
  watch: [
    async ({ page, baseURL }, use) => {
      const watch = watchPage(page, new URL(baseURL ?? "http://localhost:3000").origin);
      await use(watch);
      expectQuietPage(watch);
    },
    { auto: true },
  ],
});

export { expect };
