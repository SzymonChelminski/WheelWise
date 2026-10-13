// The public address of the site, used for canonical links, language alternates and the
// User-Agent of the refresh job. Server-only: VERCEL_PROJECT_PRODUCTION_URL does not exist in the browser.

const LOCAL_SITE_URL = 'http://localhost:3000';

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function parseConfiguredUrl(value: string): string {
  const url = parseUrl(value.replace(/\/+$/, ''));
  const isOrigin =
    url !== null &&
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === '';
  if (!isOrigin) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be an absolute http: or https: URL without a path, query or hash ` +
        `(for example https://example.org), got "${value}".`,
    );
  }
  return url.origin;
}

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return parseConfiguredUrl(configured);

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) return `https://${vercelHost}`;

  return LOCAL_SITE_URL;
}

/** An origin without a trailing slash, for example `https://example.org`. */
export const SITE_URL = resolveSiteUrl();
