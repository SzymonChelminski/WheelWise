/** Builds the answer to one request. Called once per request, so every call gets a fresh body. */
export type Reply = (url: string) => Response;

export interface RecordedRequest {
  url: string;
  headers: Record<string, string>;
}

export interface FakeFetch {
  /** Pass this where the code under test expects `fetch`. */
  fetch: typeof fetch;
  /** Every request made so far, in order. */
  requests: RecordedRequest[];
  /** URLs of the requests made so far, in order. */
  urls(): string[];
  /** Adds or replaces the answer for one exact URL. */
  on(url: string, reply: Reply): FakeFetch;
}

/**
 * A `fetch` that answers from the given table of exact URLs and throws for any
 * other URL. Nothing ever leaves the process.
 */
export function createFakeFetch(routes: Record<string, Reply> = {}): FakeFetch {
  const table = new Map(Object.entries(routes));
  const requests: RecordedRequest[] = [];

  const fake: FakeFetch = {
    requests,
    urls: () => requests.map((request) => request.url),
    on(url, reply) {
      table.set(url, reply);
      return fake;
    },
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((value, name) => {
        headers[name] = value;
      });
      requests.push({ url, headers });

      const reply = table.get(url);
      if (!reply) throw new Error(`No recorded response for ${url}`);
      return reply(url);
    }) as typeof fetch,
  };
  return fake;
}

export function jsonReply(body: unknown, status = 200): Reply {
  const text = JSON.stringify(body);
  return () => new Response(text, { status, headers: { 'content-type': 'application/json' } });
}

export function textReply(text: string, status = 200, contentType = 'text/plain'): Reply {
  return () => new Response(text, { status, headers: { 'content-type': contentType } });
}

export function bytesReply(data: Uint8Array, contentType: string): Reply {
  return () => {
    const copy = new ArrayBuffer(data.byteLength);
    new Uint8Array(copy).set(data);
    return new Response(copy, { status: 200, headers: { 'content-type': contentType } });
  };
}

/** An answer with the given HTTP status and an empty body. */
export function statusReply(status: number): Reply {
  return () => new Response(null, { status });
}

/** A `fetch` that answers every URL with the same HTTP status. It still records the requests. */
export function createFetchAnswering(status: number): FakeFetch {
  const requests: RecordedRequest[] = [];
  return {
    requests,
    urls: () => requests.map((request) => request.url),
    on() {
      throw new Error('This fake answers every URL the same way');
    },
    fetch: (async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      requests.push({ url, headers: {} });
      return new Response(null, { status });
    }) as typeof fetch,
  };
}
