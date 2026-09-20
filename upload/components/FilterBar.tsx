'use client';

import type { HazardType } from '@/lib/types';
import { HAZARDS } from '@/lib/hazards';

interface Props {
  days: number;
  onDays: (d: number) => void;
  active: Set<HazardType>;
  onToggle: (t: HazardType) => void;
  counts: Record<string, number>;
  minSeverity: number;
  onMinSeverity: (n: number) => void;
  language: string;
  onLanguage: (l: string) => void;
  located: boolean;
  geoBusy: boolean;
  onLocate: () => void;
}

const TYPES: HazardType[] = ['earthquake', 'flood', 'wildfire', 'volcano', 'storm', 'landslide'];

export default function FilterBar(p: Props) {
  return (
    <div className="toolbar">
      <div className="chips" role="group" aria-label="Hazard types">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="chip"
            aria-pressed={p.active.has(t)}
            onClick={() => p.onToggle(t)}
          >
            <span className="dot" style={{ background: HAZARDS[t].color }} />
            {HAZARDS[t].label}
            <span className="count">{p.counts[t] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="controls">
        <button type="button" className="locate" aria-pressed={p.located} onClick={p.onLocate} disabled={p.geoBusy}>
          {p.geoBusy ? 'Finding you…' : p.located ? 'Clear my location' : 'Use my location'}
        </button>
        <label>
          Time range
          <select value={p.days} onChange={(e) => p.onDays(Number(e.target.value))}>
            <option value={1}>Last 24 hours</option>
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
          </select>
        </label>
        <label>
          Severity
          <select value={p.minSeverity} onChange={(e) => p.onMinSeverity(Number(e.target.value))}>
            <option value={1}>All</option>
            <option value={2}>Moderate and up</option>
            <option value={3}>High and up</option>
            <option value={4}>Extreme only</option>
          </select>
        </label>
        <label>
          Brief language
          <select value={p.language} onChange={(e) => p.onLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="te">తెలుగు</option>
            <option value="es">Español</option>
          </select>
        </label>
      </div>
    </div>
  );
}
