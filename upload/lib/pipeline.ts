import type { DisasterEvent, EventsResponse, SourceName, SourceStatus } from './types';
import { fetchUSGS } from './sources/usgs';
import { fetchEONET } from './sources/eonet';
import { fetchGDACS } from './sources/gdacs';
import { dedupe } from './models/dedupe';
import { clusterEvents } from './models/cluster';
import { scoreEvent } from './models/priority';

/** Add a new data source by adding one adapter here. */
const ADAPTERS: { name: SourceName; fetch: (days: number) => Promise<DisasterEvent[]> }[] = [
  { name: 'USGS', fetch: fetchUSGS },
  { name: 'EONET', fetch: fetchEONET },
  { name: 'GDACS', fetch: fetchGDACS },
];

export function enrich(raw: DisasterEvent[], now = Date.now()) {
  const events = dedupe(raw);
  const { clusterIds, hotspots } = clusterEvents(events);
  const sizeOf = new Map(hotspots.map((h) => [h.id, h.count]));
  events.forEach((ev, i) => {
    ev.clusterId = clusterIds[i];
    const { priority, breakdown } = scoreEvent(ev, clusterIds[i] == null ? 1 : sizeOf.get(clusterIds[i]!) ?? 1, now);
    ev.priority = priority;
    ev.priorityBreakdown = breakdown;
  });
  events.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return { events, hotspots };
}

export async function buildEvents(days: number): Promise<EventsResponse> {
  const results = await Promise.allSettled(ADAPTERS.map((a) => a.fetch(days)));
  const sources: SourceStatus[] = [];
  const raw: DisasterEvent[] = [];
  results.forEach((r, i) => {
    const name = ADAPTERS[i].name;
    if (r.status === 'fulfilled') {
      raw.push(...r.value);
      sources.push({ name, ok: true, count: r.value.length });
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : 'request failed';
      sources.push({ name, ok: false, count: 0, error: msg });
    }
  });
  const { events, hotspots } = enrich(raw);
  return { events, hotspots, sources, generatedAt: new Date().toISOString(), days };
}
