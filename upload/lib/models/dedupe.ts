import type { DisasterEvent } from '../types';
import { haversineKm } from '../geo';

/**
 * Cross-source deduplication: the same real-world event is often reported by more than one feed.
 * Two events merge when they come from different feeds, share a hazard type and are close in space and time.
 * Events from the same feed are always distinct (e.g. separate aftershocks).
 */
export function dedupe(events: DisasterEvent[]): DisasterEvent[] {
  const sorted = [...events].sort((a, b) => b.severity - a.severity);
  const kept: DisasterEvent[] = [];
  for (const ev of sorted) {
    const quake = ev.type === 'earthquake';
    const maxKm = quake ? 100 : 250;
    const maxMs = (quake ? 6 : 96) * 3600000;
    const t = new Date(ev.time).getTime();
    const twin = kept.find(
      (k) =>
        k.type === ev.type &&
        !ev.sources.some((s) => k.sources.includes(s)) && // one feed never duplicates itself
        Math.abs(new Date(k.time).getTime() - t) <= maxMs &&
        haversineKm(k.lat, k.lng, ev.lat, ev.lng) <= maxKm,
    );
    if (!twin) {
      kept.push({ ...ev, sources: [...ev.sources] });
      continue;
    }
    for (const s of ev.sources) if (!twin.sources.includes(s)) twin.sources.push(s);
    twin.url ??= ev.url;
    twin.description ??= ev.description;
    twin.magnitude ??= ev.magnitude;
    twin.magnitudeUnit ??= ev.magnitudeUnit;
  }
  return kept;
}
