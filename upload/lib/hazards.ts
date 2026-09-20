import type { Brief, DisasterEvent, HazardType } from './types';
import { SEVERITY_LABEL } from './format';

interface HazardInfo {
  label: string;
  plural: string;
  color: string;
  /** Standard public-safety actions, used as the offline/template checklist. */
  checklist: string[];
  why: string;
}

export const HAZARDS: Record<HazardType, HazardInfo> = {
  earthquake: {
    label: 'Earthquake',
    plural: 'earthquakes',
    color: '#d9a300',
    checklist: [
      'Drop, cover and hold on until the shaking stops.',
      'Stay away from windows, heavy furniture and outer walls.',
      'Expect aftershocks; move to open ground once it is safe.',
      'Check for gas leaks and damaged wiring before re-entering buildings.',
      'Keep phone lines free for emergencies; use text messages.',
    ],
    why: 'Strong shaking can damage buildings and trigger aftershocks, landslides or tsunamis near coasts.',
  },
  flood: {
    label: 'Flood',
    plural: 'floods',
    color: '#1d7fc4',
    checklist: [
      'Move to higher ground; do not wait for water to reach you.',
      'Never walk or drive through floodwater.',
      'Switch off electricity at the mains if water is entering the home.',
      'Keep documents, medicines and a charged phone in a waterproof bag.',
      'Follow evacuation orders from local authorities.',
    ],
    why: 'Floodwater rises quickly, hides hazards and can cut off roads, power and clean water.',
  },
  wildfire: {
    label: 'Wildfire',
    plural: 'wildfires',
    color: '#e0621b',
    checklist: [
      'Be ready to leave early; know two exit routes.',
      'Close windows and doors; move flammable items away from the house.',
      'Wear an N95 mask outdoors if smoke is heavy.',
      'Keep a go-bag with documents, medicines and water.',
      'Follow evacuation orders immediately.',
    ],
    why: 'Fires spread fast with wind and heat, and smoke can affect air quality far from the flames.',
  },
  volcano: {
    label: 'Volcanic activity',
    plural: 'volcanic events',
    color: '#c2352b',
    checklist: [
      'Follow the exclusion zone set by local volcano authorities.',
      'If ash falls, stay indoors and close windows and vents.',
      'Wear a mask and eye protection outside; avoid driving in ash.',
      'Cover water tanks and keep pets and livestock sheltered.',
      'Move away from river valleys that could carry mudflows.',
    ],
    why: 'Eruptions can send ash, gas and mudflows across wide areas and disrupt air travel.',
  },
  storm: {
    label: 'Storm',
    plural: 'storms',
    color: '#7b5bd6',
    checklist: [
      'Shelter indoors away from windows; avoid coastal and low-lying areas.',
      'Secure loose outdoor objects and charge phones and power banks.',
      'Store drinking water and food for at least three days.',
      'Avoid travel while winds and heavy rain continue.',
      'Follow official warnings and evacuation instructions.',
    ],
    why: 'High winds, heavy rain and storm surge can cause flooding, power cuts and structural damage.',
  },
  landslide: {
    label: 'Landslide',
    plural: 'landslides',
    color: '#2f9e5b',
    checklist: [
      'Move away from the slide path, uphill or sideways, not downhill.',
      'Watch for cracks in the ground, tilting trees and muddy water in streams.',
      'Avoid steep slopes and riverbanks during and after heavy rain.',
      'Listen for unusual rumbling and leave immediately if you hear it.',
      'Report blocked roads and damaged utilities to local authorities.',
    ],
    why: 'Slides often follow heavy rain or earthquakes and can bury roads and homes with little warning.',
  },
  other: {
    label: 'Other hazard',
    plural: 'other hazards',
    color: '#6b7a86',
    checklist: [
      'Follow guidance from local authorities.',
      'Keep a charged phone, water and essential medicines at hand.',
      'Check on neighbours who may need help.',
      'Avoid affected areas until officials say it is safe.',
    ],
    why: 'Conditions may change quickly; local authorities have the most current guidance.',
  },
};

export function templateBrief(ev: DisasterEvent, language = 'en'): Brief {
  const h = HAZARDS[ev.type];
  const mag = ev.magnitude != null ? ` (${ev.magnitude}${ev.magnitudeUnit ? ' ' + ev.magnitudeUnit : ''})` : '';
  return {
    summary: `${SEVERITY_LABEL[ev.severity]}-severity ${h.label.toLowerCase()}${mag}: ${ev.title}. Reported by ${ev.sources.join(', ')}.`,
    whyItMatters: h.why,
    checklist: h.checklist,
    generatedBy: 'template',
    language,
  };
}
