'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DisasterEvent, Hotspot } from '@/lib/types';
import { HAZARDS } from '@/lib/hazards';

interface Props {
  events: DisasterEvent[];
  hotspots: Hotspot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userPos?: { lat: number; lng: number } | null;
  nearKm?: number;
}

const RADIUS = [0, 5, 7, 10, 14];

function styleFor(ev: DisasterEvent, selected: boolean): L.CircleMarkerOptions {
  return {
    radius: RADIUS[ev.severity] + (selected ? 3 : 0),
    color: selected ? '#16232D' : '#ffffff',
    weight: selected ? 3 : 1,
    fillColor: HAZARDS[ev.type].color,
    fillOpacity: 0.78,
  };
}

export default function MapView({ events, hotspots, selectedId, onSelect, userPos, nearKm = 500 }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Map<string, L.CircleMarker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // create the map once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { center: [15, 30], zoom: 2, minZoom: 2, worldCopyJump: true });
    L.tileLayer(process.env.NEXT_PUBLIC_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.createPane('hotspots').style.zIndex = '350';
    layerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // keep the map sized to its container (fixes grey areas after layout changes)
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      ro.disconnect();
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      userLayerRef.current = null;
      markers.current.clear();
    };
  }, []);

  // draw hotspots and events
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markers.current.clear();
    for (const h of hotspots) {
      L.circle([h.lat, h.lng], {
        pane: 'hotspots',
        radius: h.radiusKm * 1000,
        color: '#b7311f',
        weight: 1.5,
        dashArray: '6 6',
        fillColor: '#b7311f',
        fillOpacity: 0.06,
      })
        .bindTooltip(`Hotspot: ${h.label}`, { sticky: true })
        .addTo(layer);
    }
    for (const ev of events) {
      const m = L.circleMarker([ev.lat, ev.lng], styleFor(ev, false));
      m.bindTooltip(ev.title, { direction: 'top' });
      m.on('click', () => onSelectRef.current(ev.id));
      m.addTo(layer);
      markers.current.set(ev.id, m);
    }
  }, [events, hotspots]);

  // the person's own position and search radius
  useEffect(() => {
    const layer = userLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!userPos) return;
    L.circle([userPos.lat, userPos.lng], {
      pane: 'hotspots',
      radius: nearKm * 1000,
      color: '#0e6b63',
      weight: 1.5,
      dashArray: '2 6',
      fill: false,
      interactive: false,
    }).addTo(layer);
    L.circleMarker([userPos.lat, userPos.lng], {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#0e6b63',
      fillOpacity: 1,
    })
      .bindTooltip('You are here', { direction: 'top' })
      .addTo(layer);
    map.flyTo([userPos.lat, userPos.lng], 5, { duration: 0.8 });
  }, [userPos, nearKm]);

  // highlight and fly to the selected event
  useEffect(() => {
    const map = mapRef.current;
    markers.current.forEach((m, id) => {
      const ev = events.find((e) => e.id === id);
      if (ev) m.setStyle(styleFor(ev, id === selectedId));
    });
    if (!map || !selectedId) return;
    const ev = events.find((e) => e.id === selectedId);
    if (!ev) return;
    markers.current.get(selectedId)?.bringToFront();
    map.flyTo([ev.lat, ev.lng], Math.max(map.getZoom(), 4), { duration: 0.8 });
  }, [selectedId, events]);

  return <div ref={elRef} className="map" role="application" aria-label="Map of current hazard events" />;
}
