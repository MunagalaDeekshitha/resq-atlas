// Logic checks using small hand-written sample payloads (offline).
// They verify our parsing / modelling code, not the live feeds themselves.
import assert from 'node:assert/strict';
import { parseUSGS } from '../lib/sources/usgs';
import { parseEONET } from '../lib/sources/eonet';
import { parseGDACS } from '../lib/sources/gdacs';
import { enrich } from '../lib/pipeline';
import { templateBrief } from '../lib/hazards';

const now = Date.parse('2026-09-19T12:00:00Z');
const hoursAgo = (h: number) => now - h * 3600000;

const usgs = parseUSGS(
  {
    features: [
      { id: 'a1', properties: { mag: 7.4, place: '30 km E of Testville', time: hoursAgo(3), url: 'u' }, geometry: { coordinates: [-74.0, 4.6, 10] } },
      { id: 'a2', properties: { mag: 4.8, place: 'Somewhere', time: hoursAgo(300) }, geometry: { coordinates: [10, 10, 5] } },
      { id: 'bad', properties: { mag: null, time: hoursAgo(1) }, geometry: { coordinates: [0, 0] } },
    ],
  },
  7,
  now,
);
assert.equal(usgs.length, 1, 'old and malformed quakes are dropped');
assert.equal(usgs[0].severity, 4);

const eonet = parseEONET({
  events: [
    { id: 'EONET_1', title: 'Volcano X', link: 'l', categories: [{ id: 'volcanoes' }], geometry: [{ date: '2026-09-18T00:00:00Z', type: 'Point', coordinates: [110.4, -7.5] }] },
    { id: 'EONET_2', title: 'Fire Y', categories: [{ id: 'wildfires' }], geometry: [{ date: '2026-09-18T00:00:00Z', magnitudeValue: 20000, magnitudeUnit: 'acres', type: 'Polygon', coordinates: [[[10, 10], [12, 10], [12, 12], [10, 12]]] }] },
    { id: 'EONET_3', title: 'Sea ice', categories: [{ id: 'seaLakeIce' }], geometry: [{ date: '2026-09-18T00:00:00Z', type: 'Point', coordinates: [0, 0] }] },
  ],
});
assert.equal(eonet.length, 2, 'unsupported categories are skipped');
assert.equal(eonet[1].severity, 3);
assert.ok(Math.abs(eonet[1].lat - 11) < 1e-9, 'polygon centroid');

const gdacs = parseGDACS({
  features: [
    { geometry: { type: 'Point', coordinates: [-74.05, 4.55] }, properties: { eventtype: 'EQ', eventid: 1, name: 'Earthquake in Colombia', alertlevel: 'Red', fromdate: '2026-09-19T08:30:00', url: { report: 'r' } } },
    { geometry: { type: 'Point', coordinates: [110.3, -7.6] }, properties: { eventtype: 'VO', eventid: 2, name: 'Volcano Z', alertlevel: 'Orange', fromdate: '2026-09-18T01:00:00' } },
  ],
});
assert.equal(gdacs.length, 2);
assert.equal(gdacs[0].severity, 4);

const { events, hotspots } = enrich([...usgs, ...eonet, ...gdacs], now);
// USGS + GDACS Colombia quake merged; EONET + GDACS Indonesia volcano merged
assert.equal(events.filter((e) => e.type === 'earthquake').length, 1, 'quake deduplicated');
assert.equal(events.filter((e) => e.type === 'volcano').length, 1, 'volcano deduplicated');
const quake = events.find((e) => e.type === 'earthquake')!;
assert.deepEqual([...quake.sources].sort(), ['GDACS', 'USGS']);
assert.ok(events[0].priority! >= events[events.length - 1].priority!, 'sorted by priority');
assert.ok(quake.priority! > 0 && quake.priority! <= 100);
assert.equal(hotspots.length, 0, 'too few events for a hotspot');

// hotspot detection
const swarm = Array.from({ length: 5 }, (_, i) => ({
  ...usgs[0], id: `s${i}`, lat: 4.6 + i * 0.3, lng: -74 + i * 0.2, time: new Date(hoursAgo(1 + i * 0.1)).toISOString(), magnitude: 5, severity: 2 as const,
}));
const r = enrich(swarm.map((s) => ({ ...s, sources: ['USGS' as const] })), now);
assert.equal(r.hotspots.length, 1, 'nearby events form one hotspot');
assert.equal(r.hotspots[0].count, 5);

assert.ok(templateBrief(quake).checklist.length >= 4);
console.log('selftest: all checks passed');
