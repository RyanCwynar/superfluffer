# Voice Platform Research

## Goal
Pick the voice AI platform for AutoBook. The platform needs to:
1. Make outbound phone calls to real phone numbers
2. Handle real-time conversation (listen, think, respond) with low latency
3. Support high-quality TTS (ideally ElevenLabs integration)
4. Provide webhooks/callbacks for call events (answered, completed, no-answer, etc.)
5. Support voice cloning (directly or via ElevenLabs)
6. Have a programmable call flow (custom prompts, tool calling for booking)

## Evaluation Criteria (ranked by priority)
1. **Voice quality** -- how natural does it sound? Can it pass as human on a cold call?
2. **Latency** -- response time between user finishing speaking and AI responding. <1s is good, <500ms is great.
3. **Conversation quality** -- does it handle interruptions, objections, natural pauses well?
4. **ElevenLabs support** -- can we plug in ElevenLabs voices/clones?
5. **Tool calling** -- can the AI invoke external tools mid-call (e.g., check calendar availability, book appointment)?
6. **Pricing** -- cost per minute for outbound calls
7. **API/SDK quality** -- how easy is it to integrate and customize?
8. **SMS capability** -- can it also send texts, or do we need a separate provider?

## Candidates

### Vapi.ai
- **What**: Voice AI platform focused on building AI phone agents
- **TTS providers**: ElevenLabs, PlayHT, Deepgram, Azure, others
- **Pricing**: ~$0.05/min platform fee + TTS/STT/LLM costs
- **Key features**: Tool calling, function calling mid-conversation, webhooks, custom LLM prompts
- **Voice cloning**: Via ElevenLabs integration
- **SMS**: No native SMS -- would need Twilio
- **Research needed**: Actual latency benchmarks, real-world voice quality, outbound call reliability

### Retell.ai
- **What**: Low-latency conversational AI for phone calls
- **TTS providers**: ElevenLabs, PlayHT, custom
- **Pricing**: ~$0.10/min (higher but claims best latency)
- **Key features**: Claims <800ms response time, interruption handling, emotional tone
- **Voice cloning**: Via ElevenLabs or their own
- **SMS**: No native SMS
- **Research needed**: Whether the latency claims hold up, pricing at scale

### Bland.ai
- **What**: AI phone calling API, positioned as simple and scalable
- **TTS providers**: Own models, less clear on ElevenLabs support
- **Pricing**: ~$0.07/min
- **Key features**: Simple API, batch calling, enterprise focused
- **Voice cloning**: Their own system
- **SMS**: Has SMS capability built in
- **Research needed**: Voice quality vs Vapi/Retell, ElevenLabs support, conversation quality

## Research Tasks
- [ ] Sign up for free tiers / trials of all three
- [ ] Make test outbound calls on each platform
- [ ] Test with ElevenLabs voice on each (where supported)
- [ ] Measure actual response latency
- [ ] Test interruption handling and natural conversation flow
- [ ] Compare pricing at ~1000 calls/month (~5 min avg = 5000 min)
- [ ] Check API docs quality and Next.js integration examples

## Decision: Retell.ai

**Chosen: Retell.ai** over Vapi and Bland.

### Why Retell
- **Real-world validation** -- friend has used it successfully, 4.9/5 Trustpilot (814 reviews) vs Vapi's 2.3/5
- **Best turn-taking / interruption handling** -- directly impacts conversion on sales calls
- **Batch calling** -- built-in, maps directly to CSV lead ingestion use case
- **Verified caller ID** -- reduces spam flagging, improves answer rates
- **Built-in SMS** -- needed for appointment reminders (requires 10DLC registration)
- **Reliability** -- Vapi has silent breaking changes that corrupt production agents; Retell's outages are shorter and communicated
- **Cost** -- ~$0.12-0.19/min all-in, competitive with Vapi

### Why not Vapi
- 2.3/5 Trustpilot, 83% 1-star reviews
- Silent breaking changes that break production agents without warning
- ~20% random call drops reported by users
- Better ElevenLabs BYOK, but friend says ElevenLabs is "meh" on phone calls anyway

### Why not Bland
- No ElevenLabs support at all
- Weakest conversation quality, 1-2s delay on interrupts
- ~800ms latency, highest of the three
- SMS is enterprise-gated
- Immature SDK (2 GitHub stars, beta)

### Voice cloning approach
Clone through Retell's API (uses ElevenLabs engine underneath). No need for separate ElevenLabs BYOK.

### TTS note
Cartesia Sonic is worth testing as an alternative to ElevenLabs -- lower latency (40-90ms vs 75-300ms), 1/5th the cost. Both Vapi and Retell support it. For phone-call audio quality, latency matters more than studio-grade fidelity.
