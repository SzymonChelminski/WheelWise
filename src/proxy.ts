import { hasLocale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACTIVE_SLUGS_READ_TIMEOUT_MS,
  ACTIVE_SLUGS_REFRESH_MS,
  ACTIVE_SLUGS_RETRY_MS,
  CAR_SLUG_PATTERN,
  MAX_CAR_SLUG_LENGTH,
} from "./config/car-lookup";
import { getActiveCars } from "./db/repositories";
import { routing } from "./i18n/routing";

const handleLocale = createMiddleware(routing);

// Slugs of the active cars, kept per server instance so that a car address costs no query.
let activeSlugs: ReadonlySet<string> | null = null;
let nextReadAt = 0;
let pendingRead: Promise<void> | null = null;

/** Rejects when `read` takes longer than the time limit; a read that never answers must not hold a request. */
function withTimeLimit<T>(read: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Reading the car list timed out")), ACTIVE_SLUGS_READ_TIMEOUT_MS);
  });
  return Promise.race([read, limit]).finally(() => clearTimeout(timer));
}

async function readActiveSlugs(): Promise<void> {
  try {
    activeSlugs = new Set((await withTimeLimit(getActiveCars())).map((car) => car.slug));
    nextReadAt = Date.now() + ACTIVE_SLUGS_REFRESH_MS;
  } catch {
    // The previous list (if any) stays in use; the page reports its own error for a failing source.
    nextReadAt = Date.now() + ACTIVE_SLUGS_RETRY_MS;
  }
}

async function currentActiveSlugs(): Promise<ReadonlySet<string> | null> {
  if (Date.now() >= nextReadAt) {
    pendingRead ??= readActiveSlugs().finally(() => {
      pendingRead = null;
    });
    // An older list answers at once while the refresh runs; without one the request waits for the read.
    if (activeSlugs === null) await pendingRead;
  }
  return activeSlugs;
}

async function isUnknownCar(slug: string): Promise<boolean> {
  if (slug.length > MAX_CAR_SLUG_LENGTH || !CAR_SLUG_PATTERN.test(slug)) return true;
  const slugs = await currentActiveSlugs();
  return slugs !== null && !slugs.has(slug);
}

/** The locale and slug of `/<locale>/cars/<slug>`, or null for any other path. */
function matchCarPath(pathname: string): { locale: string; slug: string } | null {
  const [, locale, section, slug, ...rest] = pathname.split("/");
  if (section !== "cars" || !slug || rest.length > 0 || !hasLocale(routing.locales, locale)) {
    return null;
  }
  return { locale, slug };
}

function hasBrokenEncoding(pathname: string): boolean {
  try {
    decodeURI(pathname);
    return false;
  } catch {
    return true;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // The pages cannot be rendered for such an address; without this the framework answers 500.
  if (hasBrokenEncoding(pathname)) return new NextResponse("Bad Request", { status: 400 });

  const response = handleLocale(request);
  const carPath = matchCarPath(pathname);
  if (!carPath || !(await isUnknownCar(carPath.slug))) return response;

  // The "cars" path itself has no page, so the catch-all answers it with a 404 on the first
  // request, from one shell per language that every unknown path shares. The browser keeps the
  // address that was requested.
  const notFound = NextResponse.rewrite(new URL(`/${carPath.locale}/cars`, request.url));
  for (const cookie of response.cookies.getAll()) notFound.cookies.set(cookie);
  return notFound;
}

export const config = {
  matcher: [
    // Skip API routes, Next.js internals and files with an extension.
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
    // A car address may contain a dot; it is checked like any other.
    "/(pl|en)/cars/:slug",
  ],
};
