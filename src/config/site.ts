// The public address of the site, used for canonical links, language alternates and the
// User-Agent of the refresh job. Server-only: VERCEL_PROJECT_PRODUCTION_URL does not exist in the browser.

const LOCAL_SITE_URL = 'http://localhost:3000';

// Dot-separated host name labels with an optional port. Rejects any scheme, slash, credentials or space.
const BARE_HOST = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*(?::\d{1,5})?$/;

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function parseConfiguredUrl(value: string): string {
  const url = parseUrl(value.replace(/\/+$/, ''));
  // Error messages name the variable and the rule only: the value may hold a secret.
  if (url !== null && (url.username !== '' || url.password !== '')) {
    throw new Error('NEXT_PUBLIC_SITE_URL must not contain a user name or password.');
  }
  const isOrigin =
    url !== null &&
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === '';
  if (!isOrigin) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL must be an absolute http: or https: URL without a path, query or hash ' +
        '(for example https://example.org).',
    );
  }
  return url.origin;
}

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return parseConfiguredUrl(configured);

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) {
    if (!BARE_HOST.test(vercelHost)) {
      throw new Error(
        'VERCEL_PROJECT_PRODUCTION_URL must be a bare host name with an optional port, without a scheme, ' +
          'path, credentials or spaces (for example example.org).',
      );
    }
    return `https://${vercelHost}`;
  }

  return LOCAL_SITE_URL;
}

/** An origin without a trailing slash, for example `https://example.org`. */
export const SITE_URL = resolveSiteUrl();
