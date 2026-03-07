# SuperFluffer Roadmap

## now
- **Auth + client management** -- Clerk login, seed Greg as first client, protect routes

## up next
- **Call flow & script** -- real estate qualifying conversation for Greg (blocked by: qualifying questions)
- **End-to-end test** -- Retell agent + Cal.com + real call to own number
- **SMS reminders** -- appointment confirmation + reminder texts via Retell built-in SMS
- **Voice cloning** -- clone Greg's voice through Retell's API, test quality
- **Product page** -- superfluffer.com landing page

## done
- Project kickoff and requirements gathering
- Voice platform research -- chose Retell.ai. See [docs/features/voice-platform-research.md](docs/features/voice-platform-research.md)
- MVP architecture -- spec complete. See [docs/features/mvp-architecture.md](docs/features/mvp-architecture.md)
- CSV lead ingestion -- upload CSV, parse, validate phone numbers, create batch + leads
- Calendar integration -- Cal.com via Retell built-in tools (syncs to Google Calendar)
- Retry logic -- 3 attempts (immediate, +2hrs, +24hrs), scheduled via Convex
- Frontend -- CSV upload with drag-and-drop, lead status table, batch sidebar
- Multi-tenant refactor -- clients table, per-client Retell agents, scoped leads/batches
- Renamed to SuperFluffer (superfluffer.com)
