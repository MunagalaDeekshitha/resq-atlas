# ResQ Atlas

**A live multi-hazard map that turns raw disaster feeds into a ranked list and a plain-language "what to do" brief.**

Built for HackDevengers 2.0 (24-hour open innovation hackathon).

**Live demo:** https://resq-atlas-hack.vercel.app/

## The problem
Disaster information is scattered across separate agencies and feeds, each with its own format, and much of it is technical. People in affected areas, volunteers and NGOs lack one clear view of what is happening near them and what to do about it.

## What it does
- Merges live earthquake, flood, wildfire, volcano, storm and landslide events from **USGS**, **NASA EONET** and **GDACS** onto one map.
- **Hotspot detection** (DBSCAN clustering) highlights regions where several hazards occur close together.
- **Priority score** (0-100) ranks what to look at first, with a visible breakdown of how it was computed.
- **AI brief** for each event: a short summary, why it matters, and a hazard-specific action checklist, in English, Hindi, Telugu or Spanish.
- **Cross-source deduplication** merges the same event reported by more than one feed.
- **Near me:** opt-in browser location shows the closest active events and their distances, and tailors the brief. Your position stays in your browser; only a rounded distance (and, for the chat, a position rounded to about 10 km) is sent to the server.
- **Ask the map:** a chat that answers questions about the live events, using only the current data as context.
- **Photo check:** upload a photo of flooding or damage and get visible hazards, precautions and an urgency level. It never declares anything safe and always points to local emergency services.
- **Share and print:** share any event on WhatsApp or by link (`/?event=<id>`), and print or save a one-page safety card with a go-bag checklist and emergency numbers.
- Works without an AI key: it falls back to standard safety guidance per hazard type.
- If a data source is down, the app keeps working with the others and says so.

## Run it
```bash
npm install
cp .env.example .env.local   # optional: add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY for AI features
npm run dev                  # http://localhost:3000
npm run selftest             # offline checks of the parsing and modelling logic
```
On Windows, create the `.env.local` file with `copy .env.example .env.local` instead of `cp`.

**Deploy to Vercel:** import the repository, set the **Root Directory** to `upload`, add `GEMINI_API_KEY` (optional, a free key from aistudio.google.com) and `GEMINI_MODEL` as environment variables, then deploy.

## Architecture
```
app/api/events   -> fetches all sources in parallel, dedupes, clusters, scores, caches for 5 min
app/api/brief    -> validates the event, asks the LLM for a JSON brief, falls back to templates
app/api/ask      -> answers questions from the live event data (rate limited)
app/api/triage   -> vision analysis of an uploaded photo (rate limited, image validated)
lib/ai.ts        -> one place for model calls (Gemini free tier or Anthropic, text and images)
lib/sources/     -> one adapter per feed (usgs.ts, eonet.ts, gdacs.ts), each returns DisasterEvent[]
lib/models/      -> dedupe.ts, cluster.ts (DBSCAN), priority.ts (transparent weighted score)
lib/hazards.ts   -> hazard types, colours, offline safety checklists
lib/pipeline.ts  -> the ADAPTERS list and the enrich() step
components/      -> MapView (Leaflet), FilterBar, EventList, BriefPanel, AskPanel, PhotoPanel, PrintCard
```
Every source is converted into one `DisasterEvent` shape, so the map, filters and models never depend on a specific feed. **Adding a source means adding one adapter file and one line in `lib/pipeline.ts`.**

### Priority score
50 pts severity + 25 pts recency (halves every 48 h) + 15 pts hotspot density + 10 pts multi-source confirmation. It is a ranking heuristic, not a prediction and not an official warning level.

## Responsible use
- Informational only. Always follow local authorities in an emergency.
- The AI is told to use only the feed data, never to invent damage or casualties, and to treat feed text as untrusted input.
- The API rebuilds and bounds every event it receives before it reaches the model, and AI endpoints are rate limited.
- The photo check cannot confirm that anything is safe, and photos are not stored by the app.

## Roadmap (after the hackathon)
- More feeds: national and regional alert systems, river gauges, air quality.
- Push notifications for saved places (the current Near me feature is on-demand).
- Citizen reports and volunteer or NGO coordination.
- Persistent storage and history for trend views.
- More languages and voice output.

## Stack
Next.js 14, React 18, TypeScript, Leaflet with OpenStreetMap tiles, optional AI via Google Gemini (free tier) or the Anthropic API.
