# AutoBook Roadmap

## now
- **Call flow & script** -- real estate qualifying conversation: timeline, budget, location, motivation. Objection handling. (blocked by: qualifying questions from friend)

## up next
- **End-to-end test** -- connect Convex project, Retell agent, Google Calendar. Test a real call.
- **SMS reminders** -- appointment confirmation + reminder texts via Retell built-in SMS
- **Voice cloning** -- clone friend's voice through Retell's API, test quality

## done
- Project kickoff and requirements gathering
- Voice platform research -- chose Retell.ai. See [docs/features/voice-platform-research.md](docs/features/voice-platform-research.md)
- MVP architecture -- spec complete. See [docs/features/mvp-architecture.md](docs/features/mvp-architecture.md)
- CSV lead ingestion -- upload CSV, parse, validate phone numbers, create batch + leads
- Calendar integration -- Google Calendar API via service account (pre-fetch availability, book mid-call)
- Retry logic -- 3 attempts (immediate, +2hrs, +24hrs), scheduled via Convex
- Frontend -- CSV upload with drag-and-drop, lead status table, batch sidebar
