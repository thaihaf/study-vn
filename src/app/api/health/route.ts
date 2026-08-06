import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestId = crypto.randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', checks: { database: 'ready' } }, { headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'health_failed', requestId, errorType: error instanceof Error ? error.name : 'unknown' }));
    return Response.json({ status: 'degraded', checks: { database: 'unavailable' } }, { status: 503, headers });
  }
}
