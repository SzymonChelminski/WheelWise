import { test as base, expect, type Page, type Route } from "@playwright/test";

/*
 * Every test page is watched: an error written to the browser console, an
 * uncaught exception, or a request to any origin other than the site's own
 * fails the test. A test that deliberately opens a missing page allows the
 * browser's own "404" line with `allowConsole`.
 *
 * The car page shows a model photo that the browser loads from
 * upload.wikimedia.org. Tests never leave the test machine: `stubPhotos`
 * answers every thumbnail request with a local stand-in image and refuses every
 * other request to a host that is not the local machine. Thumbnail requests
 * answered this way are listed by `photoRequests` and are not counted as
 * requests to other origins; any other outside request still is.
 */

export const PHOTO_HOST = "upload.wikimedia.org";

/** Any web address outside the local machine. */
const OUTSIDE = /^https?:\/\/(?!(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/)/i;

export interface PageWatch {
  /** Console errors that match the pattern are expected and not reported. */
  allowConsole(pattern: RegExp): void;
  consoleErrors(): string[];
  foreignRequests(): string[];
  /** Thumbnail requests to the photo host, answered locally by `stubPhotos`. */
  photoRequests(): string[];
}

export function watchPage(page: Page, siteOrigin: string, options: { photosStubbed?: boolean } = {}): PageWatch {
  const errors: string[] = [];
  const foreign: string[] = [];
  const photos: string[] = [];
  const allowed: RegExp[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(`uncaught: ${error.message}`));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.origin === siteOrigin) return;
    if (options.photosStubbed && url.protocol === "https:" && url.host === PHOTO_HOST) photos.push(request.url());
    else foreign.push(request.url());
  });

  return {
    allowConsole: (pattern) => allowed.push(pattern),
    consoleErrors: () => errors.filter((text) => !allowed.some((pattern) => pattern.test(text))),
    foreignRequests: () => [...foreign],
    photoRequests: () => [...photos],
  };
}

/** The line the browser logs when a document or resource answers 404. */
export const NOT_FOUND_LINE = /the server responded with a status of 404/;

/** The line the browser logs when an image request is refused (see `photoRoute`). */
export const PHOTO_FAILED_LINE = /Failed to load resource: net::ERR_FAILED/;

/** A plain image of the width the thumbnail address asks for ("/960px-..."), in a 3:2 shape. */
function standInPhoto(url: string): string {
  const width = Number(/\/(\d+)px-[^/]*$/.exec(new URL(url).pathname)?.[1] ?? 960);
  const height = Math.round((width * 2) / 3);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="#8a9bb0"/>` +
    `<rect x="${width / 6}" y="${height / 2}" width="${(width * 2) / 3}" height="${height / 5}" rx="${height / 20}" fill="#2f3a48"/>` +
    `</svg>`
  );
}

/** Answers a thumbnail request with the stand-in image, and refuses every other outside address. */
export async function answerPhoto(route: Route): Promise<void> {
  const url = new URL(route.request().url());
  if (url.protocol === "https:" && url.host === PHOTO_HOST) {
    await route.fulfill({ status: 200, contentType: "image/svg+xml", body: standInPhoto(url.href) });
  } else {
    await route.abort("failed");
  }
}

/** Keeps every request on the test machine. */
export async function stubPhotos(page: Page): Promise<void> {
  await page.route(OUTSIDE, answerPhoto);
}

/**
 * Takes over thumbnail requests for one test (registered after `stubPhotos`, so it runs first).
 * `handle` decides what each request gets.
 */
export async function photoRoute(page: Page, handle: (route: Route) => Promise<void>): Promise<void> {
  await page.route(OUTSIDE, async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === "https:" && url.host === PHOTO_HOST) await handle(route);
    else await route.abort("failed");
  });
}

export function expectQuietPage(watch: PageWatch): void {
  expect(watch.foreignRequests(), "requests to other origins").toEqual([]);
  expect(watch.consoleErrors(), "errors in the browser console").toEqual([]);
}

export const test = base.extend<{ watch: PageWatch }>({
  watch: [
    async ({ page, baseURL }, use) => {
      await stubPhotos(page);
      const watch = watchPage(page, new URL(baseURL ?? "http://localhost:3000").origin, { photosStubbed: true });
      await use(watch);
      expectQuietPage(watch);
    },
    { auto: true },
  ],
});

export { expect };
