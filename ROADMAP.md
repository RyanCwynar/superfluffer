# AutoBook Roadmap

## now
- **MVP architecture** -- design the system: Next.js orchestration layer, Retell integration, Google Calendar booking, SMS reminders. Write the spec. See [docs/features/mvp-architecture.md](docs/features/mvp-architecture.md)

## up next
- **CSV lead ingestion** -- upload a spreadsheet of leads, validate phone numbers, queue for Retell batch calling
- **Call flow & script** -- real estate qualifying conversation: timeline, budget, location, motivation. Objection handling.
- **Calendar integration** -- book directly to Google Calendar via API, check availability, create events with lead details
- **SMS reminders** -- appointment confirmation + reminder texts via Retell built-in SMS
- **Retry logic** -- 2-3 call attempts with configurable spacing, then mark unreachable
- **Voice cloning** -- clone friend's voice through Retell's API, test quality

## done
- Project kickoff and requirements gathering
- Voice platform research -- chose Retell.ai. See [docs/features/voice-platform-research.md](docs/features/voice-platform-research.md)
