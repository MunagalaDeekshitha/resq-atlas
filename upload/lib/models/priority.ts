import type { DisasterEvent, PriorityBreakdown } from '../types';

/**
 * Transparent priority score (0-100) used only to rank what to look at first.
 * It is a weighted heuristic, NOT a prediction or an official warning level.
 *   50 pts  severity        (feed-reported severity, 1-4)
 *   25 pts  recency         (halves every 48 hours)
 *   15 pts  hotspot         (more concurrent events nearby = higher)
 *   10 pts  corroboration   (reported by more than one source)
 */
export function scoreEvent(
  ev: DisasterEvent,
  clusterSize: number,
  now = Date.now(),
): { priority: number; breakdown: PriorityBreakdown } {
  const ageH = Math.max(0, (now - new Date(ev.time).getTime()) / 3600000);
  const breakdown: PriorityBreakdown = {
    severity: 50 * ((ev.severity - 1) / 3),
    recency: 25 * Math.pow(0.5, ageH / 48),
    hotspot: clusterSize > 1 ? 15 * Math.min(1, (clusterSize - 1) / 8) : 0,
    corroboration: ev.sources.length > 1 ? 10 : 0,
  };
  const priority = Math.round(breakdown.severity + breakdown.recency + breakdown.hotspot + breakdown.corroboration);
  return { priority, breakdown };
}
