# AutoBook

AI voice caller that turns leads into booked appointments. Built for real estate, designed to be productizable.

Orient: read ROADMAP.md and vision.md at session start.

## Stack
- **Frontend**: Next.js on Vercel
- **Backend/DB**: Convex (reactive DB, scheduled functions, HTTP actions for webhooks)
- **Voice AI**: Retell.ai (built-in LLM, batch calling, built-in Cal.com booking tools)
- **TTS**: Retell's built-in (ElevenLabs under the hood). Cartesia as fallback/alternative.
- **SMS**: Retell built-in (requires 10DLC registration, ~2-3 week approval)
- **Calendar**: Cal.com (free tier, Retell built-in integration, syncs to Google Calendar)
- **Voice cloning**: Through Retell's API (ElevenLabs engine underneath)

## Key Decisions
- MVP ingests leads from CSV upload, not webhook-based
- Conversion is the #1 metric -- conversation quality and low latency matter more than cost
- No CRM -- just call, qualify, book, remind
- Friend's voice cloned through Retell's voice cloning API
- Retry unreachable leads 2-3 times before marking as dead
- Retell over Vapi: better outbound sales features, reliability, user satisfaction, built-in SMS + batch calling
- Real cost: ~$0.12-0.19/min depending on TTS + LLM choice
