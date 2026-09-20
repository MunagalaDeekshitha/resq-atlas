'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EventsResponse, HazardType } from '@/lib/types';
import FilterBar from '@/components/FilterBar';
import EventList from '@/components/EventList';
import BriefPanel from '@/components/BriefPanel';
import AskPanel from '@/components/AskPanel';
import PhotoPanel from '@/components/PhotoPanel';
import { timeAgo } from '@/lib/format';
import { haversineKm } from '@/lib/geo';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});

const ALL: HazardType[] = ['earthquake', 'flood', 'wildfire', 'volcano', 'storm', 'landslide'];
const NEAR_KM = 500;
type Tab = 'events' | 'ask' | 'photo';

export default function Home() {
  const [days, setDays] = useState(7);
  const [active, setActive] = useState<Set<HazardType>>(new Set(ALL));
  const [minSeverity, setMinSeverity] = useState(1);
  const [language, setLanguage] = useState('en');
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('events');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [sharedMissing, setSharedMissing] = useState(false);
  const pendingEvent = useRef<string | null>(null);

  useEffect(() => {
    pendingEvent.current = new URLSearchParams(window.location.search).get('event');
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/events?days=${days}`, { signal });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        setData((await res.json()) as EventsResponse);
        setError(null);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError('Live data could not be loaded. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [days],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    load(ctrl.signal);
    const timer = setInterval(() => load(), 5 * 60 * 1000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [load]);

  // open an event from a shared link (?event=...) once data has loaded
  useEffect(() => {
    if (!data || !pendingEvent.current) return;
    const id = pendingEvent.current;
    pendingEvent.current = null;
    if (data.events.some((e) => e.id === id)) setSelectedId(id);
    else setSharedMissing(true);
  }, [data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of data?.events ?? []) c[e.type] = (c[e.type] ?? 0) + 1;
    return c;
  }, [data]);

  const filtered = useMemo(
    () => (data?.events ?? []).filter((e) => active.has(e.type) && e.severity >= minSeverity),
    [data, active, minSeverity],
  );

  const distances = useMemo(() => {
    const m = new Map<string, number>();
    if (userPos) for (const e of filtered) m.set(e.id, haversineKm(userPos.lat, userPos.lng, e.lat, e.lng));
    return m;
  }, [filtered, userPos]);

  const nearby = useMemo(
    () =>
      filtered
        .filter((e) => (distances.get(e.id) ?? Infinity) <= NEAR_KM)
        .sort((a, b) => (distances.get(a.id) ?? 0) - (distances.get(b.id) ?? 0)),
    [filtered, distances],
  );

  const selected = filtered.find((e) => e.id === selectedId) ?? null;
  const failed = data?.sources.filter((s) => !s.ok) ?? [];

  const toggle = (t: HazardType) =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const locate = () => {
    if (userPos) {
      setUserPos(null);
      setGeoMsg(null);
      return;
    }
    if (!navigator.geolocation) {
      setGeoMsg('This browser does not support location. You can still browse the map.');
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoBusy(false);
        setGeoMsg(null);
        setTab('events');
      },
      () => {
        setGeoBusy(false);
        setGeoMsg('Location is blocked or unavailable. Allow location access in your browser to see events near you.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>ResQ Atlas</h1>
          <p className="tagline">What is happening, where, and what to do about it.</p>
        </div>
        <ul className="sources" aria-label="Data source status">
          {(data?.sources ?? []).map((s) => (
            <li key={s.name} data-ok={s.ok} title={s.error ?? `${s.count} events`}>
              <span className="pulse" />
              {s.name} {s.ok ? s.count : 'offline'}
            </li>
          ))}
          {data && <li className="updated">Updated {timeAgo(data.generatedAt)}</li>}
        </ul>
      </header>

      <FilterBar
        days={days}
        onDays={setDays}
        active={active}
        onToggle={toggle}
        counts={counts}
        minSeverity={minSeverity}
        onMinSeverity={setMinSeverity}
        language={language}
        onLanguage={setLanguage}
        located={!!userPos}
        geoBusy={geoBusy}
        onLocate={locate}
      />

      {(error || failed.length > 0 || geoMsg || sharedMissing) && (
        <div className="banner" role="status">
          {error ??
            (failed.length > 0
              ? `${failed.map((f) => f.name).join(', ')} did not respond. Showing events from the other sources.`
              : null)}
          {geoMsg && <div>{geoMsg}</div>}
          {sharedMissing && <div>The shared event is no longer in the live feed.</div>}
        </div>
      )}

      <main className="main">
        <section className="map-wrap" aria-label="Map">
          <MapView
            events={filtered}
            hotspots={data?.hotspots ?? []}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            userPos={userPos}
            nearKm={NEAR_KM}
          />
          <div className="legend">
            <span className="ring" /> Hotspot: several hazards close together
          </div>
        </section>

        <aside className="panel" aria-label="Events, questions and photo check">
          {selected && (
            <>
              <button type="button" className="back" onClick={() => setSelectedId(null)}>
                Back to the list
              </button>
              <BriefPanel
                event={selected}
                hotspots={data?.hotspots ?? []}
                language={language}
                distanceKm={distances.get(selected.id)}
              />
            </>
          )}

          <div hidden={!!selected}>
            <div className="tabs" role="tablist" aria-label="Panel sections">
              {(
                [
                  ['events', 'Priority list'],
                  ['ask', 'Ask the map'],
                  ['photo', 'Photo check'],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>

            <div hidden={tab !== 'events'}>
              {userPos && (
                <section className="nearyou">
                  <h2 className="panel-title">
                    Near you <span className="muted">within {NEAR_KM} km</span>
                  </h2>
                  {nearby.length > 0 ? (
                    <EventList events={nearby} selectedId={selectedId} onSelect={setSelectedId} distances={distances} limit={5} />
                  ) : (
                    <p className="muted">No active events within {NEAR_KM} km of you in this time range.</p>
                  )}
                </section>
              )}
              <h2 className="panel-title">
                Priority list <span className="muted">{filtered.length} events</span>
              </h2>
              {loading && !data ? (
                <p className="muted">Fetching live events…</p>
              ) : (
                <EventList events={filtered} selectedId={selectedId} onSelect={setSelectedId} distances={distances} />
              )}
            </div>

            <div hidden={tab !== 'ask'}>
              <AskPanel language={language} userPos={userPos} />
            </div>
            <div hidden={tab !== 'photo'}>
              <PhotoPanel language={language} />
            </div>
          </div>
        </aside>
      </main>

      <footer className="foot">
        Informational only, not an official warning. Data: USGS, NASA EONET, GDACS. In an emergency, follow your
        local authorities.
      </footer>
    </div>
  );
}
