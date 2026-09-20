'use client';

import type { DisasterEvent } from '@/lib/types';
import { HAZARDS } from '@/lib/hazards';
import { SEVERITY_LABEL, timeAgo } from '@/lib/format';

interface Props {
  events: DisasterEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  distances?: Map<string, number>;
  limit?: number;
}

export default function EventList({ events, selectedId, onSelect, distances, limit = 40 }: Props) {
  if (!events.length) {
    return (
      <p className="empty">
        No events match these filters. Widen the time range or lower the severity filter.
      </p>
    );
  }
  return (
    <ul className="events">
      {events.slice(0, limit).map((ev) => (
        <li key={ev.id}>
          <button
            type="button"
            className="event"
            aria-current={ev.id === selectedId}
            onClick={() => onSelect(ev.id)}
          >
            <span className="sev" data-sev={ev.severity} style={{ background: HAZARDS[ev.type].color }} />
            <span className="event-main">
              <span className="event-title">{ev.title}</span>
              <span className="event-meta">
                {HAZARDS[ev.type].label}, {SEVERITY_LABEL[ev.severity].toLowerCase()}, {timeAgo(ev.time)}
                {distances?.has(ev.id) && `, ${Math.round(distances.get(ev.id)! / 10) * 10} km away`}
              </span>
            </span>
            <span className="score" title="Priority score (0-100)">{ev.priority}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
