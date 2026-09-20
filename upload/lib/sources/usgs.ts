import type { DisasterEvent } from '../types';
import { fetchJson } from '../http';

const URL_ = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';

function sevFromMag(m: number): 1 | 2 | 3 | 4 {
  if (m >= 7) return 4;
  if (m >= 6) return 3;
  if (m >= 5) return 2;
  return 1;
}

export function parseUSGS(data: any, days: number, now = Date.now()): DisasterEvent[] {
  const cutoff = now - days * 86400000;
  const out: DisasterEvent[] = [];
  for (const f of data?.features ?? []) {
    const [lng, lat] = f?.geometry?.coordinates ?? [];
    const mag = f?.properties?.mag;
    const t = f?.properties?.time;
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof mag !== 'number' || typeof t !== 'number') continue;
    if (t < cutoff) continue;
    out.push({
      id: `usgs-${f.id}`,
      type: 'earthquake',
      title: f.properties.place ? `M${mag.toFixed(1)} earthquake, ${f.properties.place}` : `M${mag.toFixed(1)} earthquake`,
      severity: sevFromMag(mag),
      magnitude: mag,
      magnitudeUnit: 'M',
      time: new Date(t).toISOString(),
      lat,
      lng,
      sources: ['USGS'],
      url: f.properties.url,
    });
  }
  return out;
}

export async function fetchUSGS(days: number): Promise<DisasterEvent[]> {
  return parseUSGS(await fetchJson(URL_), days);
}
