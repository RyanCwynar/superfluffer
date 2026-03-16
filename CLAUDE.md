# SuperFluffer

Multi-tenant AI voice caller that books appointments. superfluffer.byldr.co

Orient: read ROADMAP.md and vision.md at session start.

## Stack
- **Frontend**: Next.js
- **Database**: Postgres (self-hosted on byldr VPS)
- **ORM**: Drizzle
- **API**: Next.js Route Handlers
- **Auth**: Clerk
- **Voice AI**: Retell.ai (built-in LLM, per-client agents + phone numbers)
- **TTS**: Retell's built-in (ElevenLabs under the hood). Cartesia as fallback/alternative.
- **SMS**: Retell built-in (requires 10DLC registration, ~2-3 week approval)
- **Calendar**: Cal.com (free tier, Retell built-in integration, syncs to Google Calendar)
- **Voice cloning**: Through Retell's API (ElevenLabs engine underneath)
- **Data fetching**: SWR (polling with 5s refresh for live call status updates)
- **Deployment**: pm2 on byldr VPS, Traefik reverse proxy

## Multi-tenant Architecture
- `clients` table holds per-client config: Retell agent ID, phone number, Cal.com link, timezone
- Each client gets their own Retell agent (with their own voice, script, Cal.com)
- Leads and batches belong to a client
- Single Retell API key (ours), multiple agents
- Frontend: client selector dropdown, then CSV upload + lead management scoped to that client

## Clients
- **Greg** -- real estate agent, Austin TX, America/Chicago

## Key Decisions
- CSV lead ingestion (webhooks from Meta ads later)
- Conversion is the #1 metric -- conversation quality and low latency matter more than cost
- No CRM -- just call, qualify, book, remind
- Retry unreachable leads 2-3 times before marking as dead
- Retell over Vapi: better outbound sales features, reliability, user satisfaction
- Real cost: ~$0.12-0.19/min depending on TTS + LLM choice

## API Routes
- `GET /api/clients` — list active clients
- `GET /api/batches?clientId=X` — list batches for a client
- `POST /api/batches` — create batch + leads, triggers calls via `after()`
- `GET /api/leads?clientId=X&batchId=Y` — list leads
- `POST /api/retell/webhook` — Retell webhook (HMAC verified)
- `GET /api/cron/retries` — retry no_answer leads (protected by CRON_SECRET)

## Database
- Schema: `clients`, `batches`, `leads` tables in Postgres
- Manage with `npx drizzle-kit push` (dev) or `npx drizzle-kit migrate` (prod)
- Retry scheduling: `nextRetryAt` stored on leads, cron endpoint picks them up
