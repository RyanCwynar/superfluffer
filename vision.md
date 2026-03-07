# SuperFluffer Vision

AI voice caller that turns cold leads into booked appointments in under 90 seconds.

## Guiding Principles

1. **Conversion above all** -- voice quality, low latency, and natural conversation are the product. If the AI sounds robotic, nothing else matters.
2. **Simple stack** -- CSV in, booked appointments out. No bloated CRM, no unnecessary middleware. The system does one thing and does it well.
3. **Multi-tenant from day one** -- each client gets their own voice, script, calendar, and phone number. Adding a new client is config, not code.
4. **Speed to lead** -- the value prop is calling leads fast. The system should be able to start dialing within seconds of receiving leads.

## What This Is

A multi-tenant platform that:
- Manages multiple clients, each with their own AI voice agent
- Ingests leads (CSV upload for now, webhooks later)
- Triggers AI voice calls via Retell.ai with cloned client voices
- Runs qualifying conversations tailored to each client's industry
- Books qualified leads onto the client's calendar via Cal.com
- Sends SMS reminders to reduce no-shows
- Retries unreachable leads 2-3 times before giving up

## What This Is Not

- Not a CRM -- it doesn't manage pipelines, deals, or long-term lead nurturing
- Not an ad platform -- it doesn't create or manage Meta ads
- Not a call center replacement -- it handles the initial qualifying call, then hands off to a human

## Long-term Direction

- Webhook ingestion from Meta Lead Ads, landing pages, etc.
- Client-facing dashboard with conversion metrics and call analytics
- Self-serve client onboarding (voice cloning, script builder, calendar setup)
- Warm transfer to human agents when leads request it
- Multi-industry support (real estate, home services, agencies, coaching)
- Product page at superfluffer.com
