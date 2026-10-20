import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { CarPhotoData } from '@/components/ui/CarPhoto';
import { normalizeNameCase } from '@/lib/catalog/build-catalog';
import { modelKey } from '@/lib/catalog/model-images';
import { carCatalogSchema } from '@/lib/domain/schemas';

/*
 * Resolves one free photo per car model through the official Wikipedia and Wikimedia Commons
 * APIs and writes data/model-images.json. Run it by hand when the catalogue gets new models:
 * `npm run images:build`. Stdout gets one tab-separated line per model (key, article, file,
 * licence, note); progress and warnings go to stderr.
 */

const REPOSITORY_URL = 'https://github.com/SzymonChelminski/WheelWise';
const USER_AGENT = `WheelWise-image-builder/1.0 (${REPOSITORY_URL})`;

const WIKIPEDIA = 'en.wikipedia.org';
const COMMONS = 'commons.wikimedia.org';
const UPLOAD_HOST = 'upload.wikimedia.org';

const MIN_REQUEST_INTERVAL_MS = 150;
const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_DELAY_S = 5;
const MAX_RETRY_DELAY_S = 60;
const MAX_LAG_S = 5;
const SEARCH_RESULTS = 5;

/** The standard widths that Wikimedia serves as thumbnails to direct requests. */
const THUMBNAIL_WIDTHS = [500, 960, 1280] as const;
/** The 1280 px "thumbnail" of a narrower image is the original file, not a thumbnail. */
const MIN_ORIGINAL_WIDTH = 1280;
const MAX_AUTHOR_LENGTH = 120;

const CAR_DESCRIPTION =
  /\b(?:automobiles?|cars?|vehicles?|suvs?|crossovers?|hatchbacks?|sedans?|saloons?|coup[eé]s?|minivans?|mpvs?|vans?|roadsters?|convertibles?)\b/i;
const ALLOWED_LICENSES = [/^CC0\b/i, /^Public domain\b/i, /^CC BY \d/i, /^CC BY-SA \d/i];

const overridesSchema = z.record(
  z.string(),
  z.union([
    z.strictObject({ article: z.string().min(1) }),
    z.strictObject({ file: z.string().regex(/^File:.+/) }),
    z.null(),
  ]),
);

const pagesSchema = z.object({
  query: z
    .object({
      pages: z.array(
        z.object({
          title: z.string(),
          index: z.number().optional(),
          description: z.string().optional(),
          pageimage: z.string().optional(),
        }),
      ),
    })
    .optional(),
});

const imageInfoSchema = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        missing: z.boolean().optional(),
        imageinfo: z
          .array(
            z.object({
              user: z.string().optional(),
              width: z.number(),
              height: z.number(),
              mime: z.string(),
              thumburl: z.string().optional(),
              descriptionurl: z.string(),
              extmetadata: z.record(z.string(), z.object({ value: z.unknown() })).optional(),
            }),
          )
          .optional(),
      }),
    ),
  }),
});

const apiErrorSchema = z.object({ error: z.object({ code: z.string(), info: z.string() }) });

type Override = z.infer<typeof overridesSchema>[string];

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
}

function log(message: string): void {
  console.error(message);
}

// ---- API access: one request at a time, spaced, one retry ----

let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

function retryDelayMs(response: Response): number {
  const seconds = Number(response.headers.get('retry-after'));
  const valid = Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_RETRY_DELAY_S;
  return Math.min(valid, MAX_RETRY_DELAY_S) * 1000;
}

async function apiGet(host: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`https://${host}/w/api.php`);
  const query = { action: 'query', format: 'json', formatversion: '2', maxlag: String(MAX_LAG_S), ...params };
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);

  for (let attempt = 0; ; attempt++) {
    await sleep(Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now()));
    lastRequestAt = Date.now();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Network error while requesting ${host}: ${reason}`);
    }

    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      log(`  ${host} answered ${response.status}, retrying once`);
      await sleep(retryDelayMs(response));
      continue;
    }
    if (!response.ok) throw new Error(`${host} answered ${response.status} ${response.statusText}`);

    const body: unknown = await response.json();
    const apiError = apiErrorSchema.safeParse(body);
    if (!apiError.success) return body;
    const { code, info } = apiError.data.error;
    if (code === 'maxlag' && attempt === 0) {
      log(`  ${host} is lagging, retrying once`);
      await sleep(retryDelayMs(response));
      continue;
    }
    throw new Error(`${host} API error ${code}: ${info}`);
  }
}

// ---- Article and file resolution ----

/** Lower-case letters and digits only, without diacritics. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function fileTitle(pageImage: string): string {
  return `File:${pageImage.replaceAll('_', ' ')}`;
}

interface Article {
  title: string;
  file: string | null;
}

/** The first English Wikipedia result that names the make and the model and describes a car. */
async function searchArticle(make: string, model: string): Promise<Article | null> {
  const body = pagesSchema.parse(
    await apiGet(WIKIPEDIA, {
      generator: 'search',
      gsrsearch: `${make} ${model}`,
      gsrnamespace: '0',
      gsrlimit: String(SEARCH_RESULTS),
      prop: 'pageimages|description',
      piprop: 'name',
      pilimit: String(SEARCH_RESULTS),
    }),
  );
  const pages = [...(body.query?.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const page = pages.find(
    (candidate) =>
      fold(candidate.title).includes(fold(make)) &&
      fold(candidate.title).includes(fold(model)) &&
      CAR_DESCRIPTION.test(candidate.description ?? ''),
  );
  return page ? { title: page.title, file: page.pageimage ? fileTitle(page.pageimage) : null } : null;
}

async function leadImageOf(article: string): Promise<Article | null> {
  const body = pagesSchema.parse(
    await apiGet(WIKIPEDIA, { titles: article, redirects: '1', prop: 'pageimages', piprop: 'name' }),
  );
  const page = body.query?.pages[0];
  return page ? { title: page.title, file: page.pageimage ? fileTitle(page.pageimage) : null } : null;
}

// ---- Image checks on Commons ----

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text.replace(/&(?:#(\d+)|#x([\da-f]+)|(\w+));/gi, (entity, dec?: string, hex?: string, name?: string) => {
    if (dec || hex) {
      const code = dec ? Number(dec) : parseInt(hex!, 16);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return named[name!.toLowerCase()] ?? entity;
  });
}

/** Plain text of a Commons HTML field, whitespace collapsed. */
function plainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function cut(text: string, max: number): string {
  const characters = [...text];
  return characters.length <= max ? text : `${characters.slice(0, max - 1).join('').trimEnd()}…`;
}

async function imageInfo(file: string, width: number) {
  const body = imageInfoSchema.parse(
    await apiGet(COMMONS, {
      titles: file,
      redirects: '1',
      prop: 'imageinfo',
      iiprop: 'url|size|mime|user|extmetadata',
      iiurlwidth: String(width),
    }),
  );
  const page = body.query.pages[0];
  return page && !page.missing ? (page.imageinfo?.[0] ?? null) : null;
}

/**
 * The API answers with thumb.wikimedia.org and a tracking query string; the same path on
 * upload.wikimedia.org serves the same file. Null when the URL is not a Wikimedia thumbnail.
 */
function uploadUrl(thumbnailUrl: string): string | null {
  const url = new URL(thumbnailUrl);
  if (url.protocol !== 'https:' || !['thumb.wikimedia.org', UPLOAD_HOST].includes(url.hostname)) return null;
  return `https://${UPLOAD_HOST}${url.pathname}`;
}

type Resolved = { photo: CarPhotoData } | { reason: string };

async function resolvePhoto(file: string): Promise<Resolved> {
  const first = await imageInfo(file, THUMBNAIL_WIDTHS[0]);
  if (!first) return { reason: 'file not on Commons' };

  const meta = (name: string): string => {
    const value = first.extmetadata?.[name]?.value;
    return typeof value === 'string' ? value : '';
  };
  const license = plainText(meta('LicenseShortName'));
  if (!ALLOWED_LICENSES.some((pattern) => pattern.test(license)) || meta('NonFree') === 'true') {
    return { reason: `licence not allowed: ${license || 'none'}` };
  }
  if (first.mime === 'image/svg+xml') return { reason: 'SVG' };
  if (first.width < MIN_ORIGINAL_WIDTH) return { reason: `too narrow: ${first.width} px` };

  const urls = [first.thumburl];
  for (const width of THUMBNAIL_WIDTHS.slice(1)) urls.push((await imageInfo(file, width))?.thumburl);
  const sources: CarPhotoData['sources'] = [];
  for (const [index, width] of THUMBNAIL_WIDTHS.entries()) {
    const url = urls[index] ? uploadUrl(urls[index]) : null;
    if (!url || !url.includes(`/${width}px-`)) return { reason: `no ${width} px thumbnail` };
    sources.push({ width, url });
  }

  const author = cut(plainText(meta('Artist')) || plainText(first.user ?? ''), MAX_AUTHOR_LENGTH);
  if (!author) return { reason: 'no author' };

  return {
    photo: {
      sources,
      width: first.width,
      height: first.height,
      author,
      license,
      licenseUrl: plainText(meta('LicenseUrl')) || null,
      sourceUrl: first.descriptionurl,
    },
  };
}

// ---- Main ----

interface ModelToResolve {
  key: string;
  make: string;
  model: string;
}

async function resolveModel({ key, make, model }: ModelToResolve, override: Override | undefined) {
  if (override === null) return { article: '', file: '', result: { reason: 'no photo on purpose' } };

  let article: Article | null;
  if (override && 'file' in override) article = { title: '', file: override.file };
  else if (override) article = await leadImageOf(override.article);
  else article = await searchArticle(make, normalizeNameCase(model));

  if (!article) return { article: '', file: '', result: { reason: 'no matching article' } };
  if (!article.file) return { article: article.title, file: '', result: { reason: 'article has no lead image' } };
  log(`${key}: ${article.title || '(file override)'} -> ${article.file}`);
  return { article: article.title, file: article.file, result: await resolvePhoto(article.file) };
}

async function main(): Promise<void> {
  const cars = carCatalogSchema.parse(readJson('data/fixtures/cars.json'));
  const overrides = overridesSchema.parse(readJson('data/model-image-overrides.json'));

  const models = new Map<string, ModelToResolve>();
  for (const { make, model } of cars) {
    const key = modelKey({ make, model });
    if (!models.has(key)) models.set(key, { key, make, model });
  }
  for (const key of Object.keys(overrides)) {
    if (!models.has(key)) log(`Warning: the override for ${key} matches no model of the catalogue`);
  }

  const images: Record<string, CarPhotoData | null> = {};
  for (const model of [...models.values()].sort((a, b) => (a.key < b.key ? -1 : 1))) {
    const override = Object.hasOwn(overrides, model.key) ? overrides[model.key] : undefined;
    const { article, file, result } = await resolveModel(model, override);
    images[model.key] = 'photo' in result ? result.photo : null;
    const license = 'photo' in result ? result.photo.license : '-';
    const note = 'photo' in result ? '' : result.reason;
    console.log([model.key, article, file, license, note].join('\t'));
  }

  const found = Object.values(images).filter(Boolean).length;
  writeFileSync(resolve(process.cwd(), 'data/model-images.json'), `${JSON.stringify(images, null, 2)}\n`, 'utf8');
  log(`Wrote data/model-images.json: ${found} of ${models.size} models have a photo`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
