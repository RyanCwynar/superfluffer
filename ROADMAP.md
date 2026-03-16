# SuperFluffer Roadmap

## now
- **VPS deployment** -- deploy to byldr with Docker + Traefik, point superfluffer.com
- **Greg end-to-end test** -- Retell agent + Cal.com + real call to own number

## up next
- **Call flow & script** -- real estate qualifying conversation for Greg (blocked by: qualifying questions)
- **SMS reminders** -- appointment confirmation + reminder texts via Retell built-in SMS
- **Voice cloning** -- clone Greg's voice through Retell's API, test quality
- **Product page** -- superfluffer.com landing page

## done
- Project kickoff and requirements gathering
- Voice platform research -- deep-dived Vapi, Retell, Bland + ElevenLabs. Chose Retell.ai (best turn-taking, 4.9/5 Trustpilot, built-in batch calling + SMS). See [docs/features/voice-platform-research.md](docs/features/voice-platform-research.md)
- MVP architecture -- full spec: data flow, schema, Retell custom functions, retry logic, deployment. See [docs/features/mvp-architecture.md](docs/features/mvp-architecture.md)
- Calendar decision -- switched from Google Calendar API (service account) to Cal.com (Retell built-in tools, zero custom code, syncs to Google Calendar)
- Backend + API -- Drizzle schema (clients, batches, leads), Next.js API routes, Retell webhook with HMAC verification, retry cron endpoint
- Retell integration -- batch calling, per-client agent/phone config, dynamic variables, webhook handling (call_ended, call_analyzed)
- CSV lead ingestion -- upload CSV, parse, validate phone numbers to E.164, preview, create batch + auto-trigger calls
- Retry logic -- 3 attempts (immediate, +2hrs, +24hrs) via nextRetryAt + cron endpoint
- Frontend -- CSV drag-and-drop upload, lead status table with color-coded badges, batch sidebar, SWR data fetching
- Multi-tenant refactor -- clients table with per-client Retell agent, phone number, Cal.com link, timezone. Leads/batches scoped to client. Client selector in UI.
- Auth -- Clerk integration (login, sign-up, middleware protecting all routes, UserButton in header, dark theme)
- Stack migration -- replaced Convex with Neon Postgres + Drizzle ORM + Next.js API routes + SWR
- Renamed project from AutoBook to SuperFluffer (superfluffer.com)
- Infrastructure migration -- swapped Neon serverless driver for postgres.js, targeting self-hosted Postgres on byldr VPS
