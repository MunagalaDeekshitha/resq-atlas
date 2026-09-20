# ResQ Atlas

**A live multi-hazard map that turns raw disaster feeds into a ranked list and a plain-language "what to do" brief.**

Built for HackDevengers 2.0 (24-hour open innovation hackathon).

**Live demo:** https://resq-atlas-hack.vercel.app/

## The problem
Disaster information is scattered across separate agencies and feeds, each in its own technical format. People in affected areas, volunteers and NGOs have no single, plain-language view of what is happening near them and what to do about it.

## What it does
- Merges live earthquake, flood, wildfire, volcano, storm and landslide events from USGS, NASA EONET and GDACS onto one map.
- Hotspot detection (DBSCAN clustering) highlights regions where several hazards occur close together.
- A transparent 0-100 priority score ranks what to look at first.
- An AI safety brief for each event in English, Hindi, Telugu or Spanish.
- **Near me:** the closest active events and their distances.
- **Ask the map:** a chat that answers from the live event data.
- **Photo check:** visible hazards and precautions from an uploaded photo. It never declares anything safe.
- **Share and print:** WhatsApp sharing and a one-page safety card with emergency numbers.
- Works without AI (standard safety guidance) and keeps working if a data source is down.

## Tech stack
Next.js, TypeScript, Leaflet with OpenStreetMap tiles, Google Gemini (optional, for AI features), deployed on Vercel.

## Source code
The full project is in the [`upload`](./upload) folder. Setup and architecture details are in [`upload/README.md`](./upload/README.md).

```bash
cd upload
npm install
npm run dev
```

## Responsible use
Informational only, not an official warning. In an emergency, follow your local authorities.
