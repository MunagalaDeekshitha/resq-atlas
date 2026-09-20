import { NextRequest, NextResponse } from 'next/server';
import { buildEvents } from '@/lib/pipeline';
import { cached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get('days') ?? 7);
  const days = Number.isFinite(raw) ? Math.min(7, Math.max(1, Math.round(raw))) : 7;
  const data = await cached(`events:${days}`, 5 * 60 * 1000, () => buildEvents(days), (d) =>
    d.sources.some((s) => s.ok),
  );
  return NextResponse.json(data);
}
