'use client';

import { useEffect, useState } from 'react';
import type { Brief, DisasterEvent, Hotspot } from '@/lib/types';
import { HAZARDS, templateBrief } from '@/lib/hazards';
import { SEVERITY_LABEL, timeAgo } from '@/lib/format';
import PrintCard from './PrintCard';

interface Props {
  event: DisasterEvent;
  hotspots: Hotspot[];
  language: string;
  distanceKm?: number;
}

const MAX = { severity: 50, recency: 25, hotspot: 15, corroboration: 10 } as const;
const NAMES = {
  severity: 'Severity',
  recency: 'Recency',
  hotspot: 'Hotspot',
  corroboration: 'Multiple sources',
} as const;

export default function BriefPanel({ event, hotspots, language, distanceKm }: Props) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [copied, setCopied] = useState(false);
  const dist = distanceKm != null ? Math.round(distanceKm / 10) * 10 : undefined;

  useEffect(() => {
    const ctrl = new AbortController();
    setState('loading');
    setBrief(null);
    fetch('/api/brief', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ event, language, distanceKm: dist }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad response'))))
      .then((b: Brief) => {
        setBrief(b);
        setState('ready');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setState('error');
      });
    return () => ctrl.abort();
    // event.id (not the object) so the 5-minute data refresh does not re-request the brief
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, language, dist]);

  const hotspot = event.clusterId != null ? hotspots.find((h) => h.id === event.clusterId) : undefined;
  const h = HAZARDS[event.type];
  const link = () => `${window.location.origin}/?event=${encodeURIComponent(event.id)}`;

  function shareWhatsApp() {
    const text = `${event.title}\n${(brief?.summary ?? '').slice(0, 220)}\nLive map: ${link()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', link());
    }
  }

  return (
    <article className="brief">
      <header>
        <h2>{event.title}</h2>
        <p className="meta">
          {h.label}, {SEVERITY_LABEL[event.severity].toLowerCase()} severity, {timeAgo(event.time)}
          {event.magnitude != null && `, ${event.magnitude}${event.magnitudeUnit ? ' ' + event.magnitudeUnit : ''}`}
        </p>
      </header>

      {dist != null && <p className="near-note">About {dist} km from your location.</p>}
      {hotspot && (
        <p className="hotspot-note">
          Inside a hotspot: {hotspot.label} within about {hotspot.radiusKm} km.
        </p>
      )}

      {state === 'loading' && <p className="muted">Preparing a plain-language brief…</p>}
      {state === 'error' && <p className="muted">The brief could not be loaded. Select the event again to retry.</p>}
      {brief && (
        <>
          <p>{brief.summary}</p>
          <h3>Why it matters</h3>
          <p>{brief.whyItMatters}</p>
          <h3>What to do</h3>
          <ul className="checklist">
            {brief.checklist.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <p className="muted small">
            {brief.generatedBy === 'ai'
              ? 'Written by an AI model from the feed data above.'
              : language !== 'en'
                ? 'Standard safety guidance, shown in English. Translated briefs need an AI key on the server.'
                : 'Standard safety guidance for this hazard type.'}
          </p>
        </>
      )}

      <div className="actions">
        <button type="button" onClick={shareWhatsApp}>Share on WhatsApp</button>
        <button type="button" onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
        <button type="button" onClick={() => window.print()}>Print safety card</button>
      </div>

      <h3>Priority {event.priority} of 100</h3>
      {event.priorityBreakdown && (
        <dl className="breakdown">
          {(Object.keys(MAX) as (keyof typeof MAX)[]).map((k) => (
            <div key={k}>
              <dt>{NAMES[k]}</dt>
              <dd>
                <span className="bar">
                  <span style={{ width: `${(event.priorityBreakdown![k] / MAX[k]) * 100}%` }} />
                </span>
                {Math.round(event.priorityBreakdown![k])}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="muted small">
        Source: {event.sources.join(', ')}
        {event.url && (
          <>
            {' '}
            <a href={event.url} target="_blank" rel="noopener noreferrer">
              Open the original report
            </a>
          </>
        )}
      </p>

      <PrintCard event={event} brief={brief ?? templateBrief(event, language)} />
    </article>
  );
}
