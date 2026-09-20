import type { DisasterEvent, HazardType } from '../types';
import { fetchJson } from '../http';

const TYPE: Record<string, HazardType> = {
  EQ: 'earthquake',
  TC: 'storm',
  FL: 'flood',
  VO: 'volcano',
  WF: 'wildfire',
};

const ALERT: Record<string, 1 | 2 | 3 | 4> = { green: 1, orange: 3, red: 4 };

export function parseGDACS(data: any): DisasterEvent[] {
  const out: DisasterEvent[] = [];
  for (const f of data?.features ?? []) {
    const p = f?.properties ?? {};
    const type = TYPE[String(p.eventtype ?? '').toUpperCase()];
    const [lng, lat] = f?.geometry?.coordinates ?? [];
    if (!type || typeof lat !== 'number' || typeof lng !== 'number') continue;
    const raw = String(p.todate || p.fromdate || '');
    const time = raw ? new Date(raw.endsWith('Z') ? raw : raw + 'Z') : null;
    if (!time || isNaN(time.getTime())) continue;
    const sev = p.severitydata ?? {};
    out.push({
      id: `gdacs-${p.eventtype}-${p.eventid}`,
      type,
      title: String(p.name || p.description || 'GDACS event'),
      severity: ALERT[String(p.alertlevel ?? '').toLowerCase()] ?? 2,
      magnitude: typeof sev.severity === 'number' ? sev.severity : undefined,
      magnitudeUnit: sev.severityunit || undefined,
      time: time.toISOString(),
      lat,
      lng,
      sources: ['GDACS'],
      url: p.url?.report || p.url?.details,
      description: sev.severitytext || undefined,
    });
  }
  return out;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function fetchGDACS(days: number): Promise<DisasterEvent[]> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  // Orange/Red alerts only: the significant events (green quakes are already covered by USGS).
  const url =
    'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH' +
    `?eventlist=EQ;TC;FL;VO;WF&fromdate=${ymd(from)}&todate=${ymd(to)}&alertlevel=Orange;Red`;
  return parseGDACS(await fetchJson(url));
}
