import type { DisasterEvent, HazardType } from '../types';
import { fetchJson } from '../http';

const CATEGORY: Record<string, HazardType> = {
  wildfires: 'wildfire',
  volcanoes: 'volcano',
  severeStorms: 'storm',
  floods: 'flood',
  landslides: 'landslide',
  earthquakes: 'earthquake',
};

function centroid(geom: any): [number, number] | null {
  const c = geom?.coordinates;
  if (!c) return null;
  if (geom.type === 'Point' && typeof c[0] === 'number') return [c[0], c[1]];
  if (geom.type === 'Polygon' && Array.isArray(c[0])) {
    const ring: number[][] = c[0];
    if (!ring.length) return null;
    const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return [lng, lat];
  }
  return null;
}

function severity(type: HazardType, mag?: number, unit?: string): 1 | 2 | 3 | 4 {
  if (mag == null) return 2;
  if (type === 'wildfire' && /acre/i.test(unit ?? '')) return mag >= 100000 ? 4 : mag >= 10000 ? 3 : 2;
  if (type === 'storm' && /kts|kt/i.test(unit ?? '')) return mag >= 96 ? 4 : mag >= 64 ? 3 : mag >= 34 ? 2 : 1;
  return 2;
}

export function parseEONET(data: any): DisasterEvent[] {
  const out: DisasterEvent[] = [];
  for (const e of data?.events ?? []) {
    const cat = e?.categories?.[0]?.id as string | undefined;
    const type = cat ? CATEGORY[cat] : undefined;
    if (!type) continue;
    const geoms: any[] = e.geometry ?? [];
    const g = geoms[geoms.length - 1];
    const pos = centroid(g);
    if (!pos || !g?.date) continue;
    const mag = typeof g.magnitudeValue === 'number' ? g.magnitudeValue : undefined;
    out.push({
      id: `eonet-${e.id}`,
      type,
      title: String(e.title ?? 'Untitled event'),
      severity: severity(type, mag, g.magnitudeUnit),
      magnitude: mag,
      magnitudeUnit: g.magnitudeUnit ?? undefined,
      time: new Date(g.date).toISOString(),
      lat: pos[1],
      lng: pos[0],
      sources: ['EONET'],
      url: e.link,
      description: e.description ?? undefined,
    });
  }
  return out;
}

export async function fetchEONET(days: number): Promise<DisasterEvent[]> {
  const data = await fetchJson(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=${days}&limit=400`);
  return parseEONET(data);
}
