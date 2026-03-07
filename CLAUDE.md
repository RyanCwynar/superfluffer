# SuperFluffer

Multi-tenant AI voice caller that books appointments. superfluffer.com

Orient: read ROADMAP.md and vision.md at session start.

## Stack
- **Frontend**: Next.js on Vercel
- **Backend/DB**: Convex (reactive DB, scheduled functions, HTTP actions for webhooks)
- **Voice AI**: Retell.ai (built-in LLM, per-client agents + phone numbers)
- **TTS**: Retell's built-in (ElevenLabs under the hood). Cartesia as fallback/alternative.
- **SMS**: Retell built-in (requires 10DLC registration, ~2-3 week approval)
- **Calendar**: Cal.com (free tier, Retell built-in integration, syncs to Google Calendar)
- **Voice cloning**: Through Retell's API (ElevenLabs engine underneath)

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

## Convex Deployment
- Name: resilient-deer-427
- Dashboard: https://dashboard.convex.dev/d/resilient-deer-427
- Webhook URL: https://resilient-deer-427.convex.site/retell/webhook
