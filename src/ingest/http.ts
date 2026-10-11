import { z } from 'zod';
import { HTTP, USER_AGENT } from '@/config/sources';
import { errorMessage, type JobContext } from './types';

const MAX_ATTEMPTS = 2;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Host and path for error messages. The query string is left out. */
function describe(url: string): string {
  const { host, pathname } = new URL(url);
  return `${host}${pathname}`;
}

/**
 * GET through `ctx.fetch` with the project User-Agent and a timeout. One retry
 * after a network error or an HTTP 5xx status. Any other non-2xx status throws at once.
 */
async function request(
  ctx: JobContext,
  url: string,
  accept: string,
  timeoutMs: number,
): Promise<Response> {
  let failure = new Error(`Request to ${describe(url)} failed`);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const remainingMs = ctx.deadline - ctx.now().getTime();
    if (remainingMs <= 0) {
      throw new Error(`Time budget exhausted before requesting ${describe(url)}`);
    }

    let response: Response | undefined;
    try {
      response = await ctx.fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: accept },
        signal: AbortSignal.timeout(Math.min(timeoutMs, remainingMs)),
      });
    } catch (error) {
      failure = new Error(`Request to ${describe(url)} failed: ${errorMessage(error)}`);
    }

    if (response) {
      if (response.ok) return response;
      // Release the connection without reading the body.
      await response.body?.cancel();
      failure = new Error(`HTTP ${response.status} from ${describe(url)}`);
      if (response.status < 500) throw failure;
    }
    if (attempt < MAX_ATTEMPTS) await sleep(HTTP.retryDelayMs);
  }
  throw failure;
}

async function readBytes(response: Response, url: string, maxBytes: number): Promise<ArrayBuffer> {
  const tooLarge = new Error(`Response from ${describe(url)} is too large`);
  if (Number(response.headers.get('content-length')) > maxBytes) throw tooLarge;
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maxBytes) throw tooLarge;
  return bytes;
}

export async function fetchJson(
  ctx: JobContext,
  url: string,
  timeoutMs: number = HTTP.timeoutMs,
): Promise<unknown> {
  const response = await request(ctx, url, 'application/json', timeoutMs);
  const bytes = await readBytes(response, url, HTTP.maxJsonBytes);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(`Response from ${describe(url)} is not valid JSON`);
  }
}

export async function fetchXlsx(ctx: JobContext, url: string): Promise<ArrayBuffer> {
  const response = await request(
    ctx,
    url,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    HTTP.timeoutMs,
  );
  return readBytes(response, url, HTTP.maxXlsxBytes);
}

/** Validate an external payload. The error message names the source and the failing fields. */
export function parseExternal<S extends z.ZodType>(
  schema: S,
  data: unknown,
  label: string,
): z.output<S> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`${label} has an unexpected format:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
