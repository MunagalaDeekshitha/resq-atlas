export type HazardType =
  | 'earthquake'
  | 'flood'
  | 'wildfire'
  | 'volcano'
  | 'storm'
  | 'landslide'
  | 'other';

export type SourceName = 'USGS' | 'EONET' | 'GDACS';

/** The single event shape every data source is converted into. */
export interface DisasterEvent {
  id: string;
  type: HazardType;
  title: string;
  /** 1 = low, 2 = moderate, 3 = high, 4 = extreme */
  severity: 1 | 2 | 3 | 4;
  magnitude?: number;
  magnitudeUnit?: string;
  /** ISO timestamp of the latest known observation */
  time: string;
  lat: number;
  lng: number;
  sources: SourceName[];
  url?: string;
  description?: string;
  /** 0-100, filled in by lib/models/priority.ts */
  priority?: number;
  priorityBreakdown?: PriorityBreakdown;
  clusterId?: number | null;
}

export interface PriorityBreakdown {
  severity: number;
  recency: number;
  hotspot: number;
  corroboration: number;
}

export interface Hotspot {
  id: number;
  lat: number;
  lng: number;
  radiusKm: number;
  count: number;
  types: HazardType[];
  label: string;
}

export interface SourceStatus {
  name: SourceName;
  ok: boolean;
  count: number;
  error?: string;
}

export interface EventsResponse {
  events: DisasterEvent[];
  hotspots: Hotspot[];
  sources: SourceStatus[];
  generatedAt: string;
  days: number;
}

export interface Brief {
  summary: string;
  whyItMatters: string;
  checklist: string[];
  generatedBy: 'ai' | 'template';
  language: string;
}
