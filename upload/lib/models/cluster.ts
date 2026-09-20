import type { DisasterEvent, Hotspot, HazardType } from '../types';
import { haversineKm } from '../geo';
import { HAZARDS } from '../hazards';

/**
 * Hotspot detection with DBSCAN over great-circle distance.
 * A hotspot is a region with several concurrent hazard events (e.g. a flood + landslide belt).
 */
export function clusterEvents(
  events: DisasterEvent[],
  epsKm = 250,
  minPts = 3,
): { clusterIds: (number | null)[]; hotspots: Hotspot[] } {
  const n = events.length;
  const neighbours: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (haversineKm(events[i].lat, events[i].lng, events[j].lat, events[j].lng) <= epsKm) {
        neighbours[i].push(j);
        neighbours[j].push(i);
      }
    }
  }

  const label: (number | null | undefined)[] = new Array(n).fill(undefined);
  let cid = 0;
  for (let i = 0; i < n; i++) {
    if (label[i] !== undefined) continue;
    if (neighbours[i].length + 1 < minPts) {
      label[i] = null;
      continue;
    }
    label[i] = cid;
    const queue = [...neighbours[i]];
    while (queue.length) {
      const q = queue.pop()!;
      if (label[q] === null) label[q] = cid;
      if (label[q] !== undefined) continue;
      label[q] = cid;
      if (neighbours[q].length + 1 >= minPts) queue.push(...neighbours[q]);
    }
    cid++;
  }

  const clusterIds = label.map((l) => (l === undefined ? null : l));
  const hotspots: Hotspot[] = [];
  for (let c = 0; c < cid; c++) {
    const members = events.filter((_, i) => clusterIds[i] === c);
    const lat = members.reduce((s, e) => s + e.lat, 0) / members.length;
    const lng = members.reduce((s, e) => s + e.lng, 0) / members.length;
    const far = Math.max(...members.map((m) => haversineKm(lat, lng, m.lat, m.lng)));
    const counts = new Map<HazardType, number>();
    for (const m of members) counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
    const types = [...counts.keys()];
    const label_ = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t, k]) => `${k} ${k === 1 ? HAZARDS[t].label.toLowerCase() : HAZARDS[t].plural}`)
      .join(', ');
    hotspots.push({
      id: c,
      lat,
      lng,
      radiusKm: Math.min(1500, Math.round(far + 60)),
      count: members.length,
      types,
      label: label_,
    });
  }
  return { clusterIds, hotspots };
}
