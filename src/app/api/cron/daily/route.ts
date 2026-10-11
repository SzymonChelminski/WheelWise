import { createHash, timingSafeEqual } from 'node:crypto';
import { runJob } from '@/ingest/run-job';
import { errorMessage } from '@/ingest/types';

// Hobby plan limit. The job has its own budget of 240 s.
export const maxDuration = 300;

const NO_STORE = { 'Cache-Control': 'no-store' };

const digest = (value: string) => createHash('sha256').update(value).digest();

function isAuthorized(request: Request): boolean {
  // Read before anything can return: reading a request header makes the handler run at
  // request time, so Cache Components never prerenders (and caches) a 401 at build time.
  const header = request.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({}, { status: 401, headers: NO_STORE });
  }
  try {
    const result = await runJob('daily');
    return Response.json(result, {
      status: result.status === 'failed' ? 500 : 200,
      headers: NO_STORE,
    });
  } catch (error) {
    console.error(`Daily job crashed: ${errorMessage(error)}`);
    return Response.json({ status: 'failed', results: [] }, { status: 500, headers: NO_STORE });
  }
}
