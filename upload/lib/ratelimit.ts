import type { NextRequest } from 'next/server';

const hits = new Map<string, { count: number; reset: number }>();

/** Simple per-IP fixed-window limiter so a public demo cannot burn through a free AI quota. */
export function allow(req: NextRequest, bucket: string, limit = 20, windowMs = 60_000): boolean {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  h.count++;
  return h.count <= limit;
}
