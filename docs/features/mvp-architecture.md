# MVP Architecture

## Overview

AutoBook MVP: upload a CSV of leads, AI calls each one with a cloned voice, qualifies them for real estate, books qualified leads onto Google Calendar, sends SMS confirmation.

## Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | Next.js on Vercel | Upload CSV, view lead/call status |
| Database + Backend | Convex | Reactive DB, scheduled functions for retries, HTTP actions for webhooks |
| Voice AI | Retell.ai (built-in LLM) | Outbound calls, batch calling, mid-call function calling |
| Calendar | Google Calendar API | FreeBusy for availability, Events.insert for booking |
| SMS | Retell built-in | Appointment confirmations + reminders |
| Voice Clone | Retell voice cloning API | Uses ElevenLabs engine under the hood |

## Data Flow

```
CSV Upload → Convex (parse + store leads)
                ↓
        Pre-call: Convex Action → Google Calendar FreeBusy
        → fetch available slots for next 3 days
        → store slots on lead record
                ↓
        Convex Action → Retell API (call with slots as dynamic variables)
        → AI already knows available times, zero mid-call delay
                ↓
        Retell calls lead
                ↓
    ┌─── Lead answers ───────────────────────────┐
    │                                             │
    │   AI qualifies (timeline, budget, location) │
    │           ↓                                 │
    │   AI offers available slots (already known) │
    │   "I have openings at 10, 11:30, and 2 —   │
    │    which works best for you?"                │
    │           ↓                                 │
    │   Lead picks a slot                         │
    │           ↓                                 │
    │   AI calls book_appointment                 │
    │   (Retell Custom Function → Convex HTTP     │
    │    action → Google Calendar Events.insert)   │
    │           ↓                                 │
    │   Retell sends SMS confirmation             │
    │                                             │
    └─── Lead doesn't answer ────────────────────┘
                ↓
        Retell webhook (call_ended) → Convex HTTP action
                ↓
        Convex mutation updates lead status
                ↓
        If attempts < 3: schedule retry via ctx.scheduler.runAfter()
        If attempts >= 3: mark as unreachable
```

**Why pre-fetch availability**: Checking Google Calendar mid-call adds latency (network round-trip + API call). By fetching slots before dialing and injecting them into the Retell agent as dynamic variables, the AI can offer times instantly with zero delay. Only the booking itself happens mid-call (a single fast write operation).

## Convex Schema

```typescript
// convex/schema.ts

leads: defineTable({
  name: v.string(),
  phone: v.string(),          // E.164 format
  email: v.optional(v.string()),
  source: v.optional(v.string()),  // which CSV, campaign, etc.
  status: v.union(
    v.literal("pending"),      // uploaded, not yet called
    v.literal("calling"),      // call in progress
    v.literal("no_answer"),    // didn't pick up, will retry
    v.literal("qualified"),    // answered, qualified, booking attempted
    v.literal("booked"),       // appointment confirmed
    v.literal("not_interested"),
    v.literal("unreachable"),  // exhausted retries
  ),
  callAttempts: v.number(),
  lastCallAt: v.optional(v.number()),  // timestamp
  nextRetryAt: v.optional(v.number()), // timestamp
  retellCallId: v.optional(v.string()),
  appointmentTime: v.optional(v.string()), // ISO datetime
  calendarEventId: v.optional(v.string()),
  notes: v.optional(v.string()),  // AI-generated call summary
  batchId: v.optional(v.string()),
})
  .index("by_status", ["status"])
  .index("by_phone", ["phone"]),

batches: defineTable({
  fileName: v.string(),
  uploadedAt: v.number(),
  totalLeads: v.number(),
  status: v.union(
    v.literal("processing"),
    v.literal("calling"),
    v.literal("completed"),
  ),
}),
```

## Retell Agent Configuration

**LLM**: Retell built-in (no custom LLM server needed)

**One Custom Function** registered in Retell dashboard:

### book_appointment
- **Trigger**: Lead confirms a time slot
- **Endpoint**: `https://<convex-deployment>.convex.site/retell/book-appointment`
- **Input schema**: `{ slot: string, leadName: string, leadPhone: string, notes: string }`
- **Response**: Confirmation with date/time
- **Speak during execution**: "Perfect, let me lock that in for you..."

**Dynamic variables** injected per call via `retell_llm_dynamic_variables`:
- `available_slots`: pre-fetched from Google Calendar before the call
- `lead_name`: from CSV
- `lead_phone`: from CSV

This way the AI already knows availability — no mid-call lookup needed.

## Google Calendar Setup

**Auth**: Service account with calendar sharing (not OAuth)
1. Create service account in Google Cloud Console
2. Share friend's Google Calendar with the service account email
3. Grant "Make changes to events" permission
4. Store service account credentials as Convex environment variable

**Availability logic** (our code, not Google's):
- Working hours: 7 days a week (times TBD with friend)
- Appointment duration: 15 minutes
- Query FreeBusy for busy blocks over next 3 days
- Subtract busy blocks from working hours
- Pre-fetch before each call and inject as dynamic variables into Retell

**Booking**:
- Events.insert with lead name, phone, and call notes in description
- Store calendarEventId on the lead record for reference
- No attendee invitations (service account can't send them without Workspace)

## Convex Function Architecture

```
convex/
  schema.ts          -- lead + batch tables
  http.ts            -- HTTP router for Retell webhooks + custom functions
  leads.ts           -- mutations/queries for lead CRUD
  calls.ts           -- actions for triggering Retell calls
  calendar.ts        -- actions for Google Calendar API
  retellWebhooks.ts  -- HTTP action handlers for Retell events
  retellFunctions.ts -- HTTP action handler for book_appointment custom function
```

### Key patterns:

**Triggering calls** (mutation → action):
```
1. Client calls mutation: leads.startBatch(batchId)
2. Mutation sets leads to "calling" status
3. Mutation schedules action: ctx.scheduler.runAfter(0, internal.calls.triggerBatch, { batchId })
4. Action pre-fetches Google Calendar availability (next 3 days)
5. Action calls Retell API per lead, injecting available_slots as dynamic variables
6. Action calls mutation to record Retell call IDs
```

**Receiving webhooks** (HTTP action → mutation):
```
1. Retell POSTs to /retell/webhook
2. HTTP action verifies x-retell-signature
3. HTTP action calls mutation to update lead status
4. If no_answer + attempts < 3: mutation schedules retry
```

**Mid-call booking** (HTTP action → action → mutation):
```
1. Lead confirms a time slot during call
2. Retell POSTs to /retell/book-appointment
3. HTTP action calls calendar.bookAppointment action
4. Action creates Google Calendar event via Events.insert
5. Action calls mutation to update lead status to "booked"
6. Returns confirmation to Retell → AI confirms with lead
```

## Retry Logic

- **Attempt 1**: Immediate (part of initial batch)
- **Attempt 2**: 2 hours after first attempt
- **Attempt 3**: Next day, different time of day
- After 3 attempts: mark as "unreachable"
- Retries are individual calls via Retell single call API (not batch)
- Scheduled via `ctx.scheduler.runAfter(delayMs, internal.calls.retryCall, { leadId })`

## SMS Flow

Retell's built-in SMS (requires 10DLC registration, 2-3 week approval):
- **On booking**: Send confirmation with date, time, address
- **Reminder**: 24 hours before appointment
- **Reminder**: 1 hour before appointment

Reminders scheduled via Convex `ctx.scheduler.runAt()` when booking is created.

## MVP Scope (what we're NOT building yet)

- No dashboard beyond basic lead status list
- No webhook ingestion from Meta ads (CSV only)
- No warm transfer to human agents
- No multi-tenant / multi-client support
- No call recording playback UI
- No analytics or conversion reporting
- No configurable scripts (hardcoded real estate qualifying flow)

## Environment Variables (Convex)

```
RETELL_API_KEY        -- Retell API key
GOOGLE_SA_CREDENTIALS -- Service account JSON (base64 encoded)
GOOGLE_CALENDAR_ID    -- Friend's calendar ID
AGENT_TIMEZONE        -- "America/Chicago" (CST/CDT)
WORKING_HOURS_START   -- e.g., "09:00"
WORKING_HOURS_END     -- e.g., "17:00"
APPOINTMENT_DURATION  -- 15 (minutes)
```

## Deployment

- **Next.js**: Vercel (auto-deploy on push)
- **Convex**: Vercel Marketplace integration (auto-deploy with Next.js)
- **Retell**: Dashboard config (agent, phone number, custom functions)
- **Google**: One-time service account setup + calendar sharing

## Open Questions

1. **10DLC registration** -- figure out later, not blocking MVP
2. **Working hours** -- 7 days a week, but what time range? Need from friend.
3. **Qualifying criteria** -- what makes a lead "qualified" vs "not interested"? Need the specific questions from friend.
4. **Slot staleness** -- pre-fetched slots could go stale if a batch takes a while to dial through. Mitigation: re-fetch availability every N calls, or have the book_appointment function check the slot is still free before confirming.
