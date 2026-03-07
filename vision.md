# AutoBook Vision

AI voice caller that turns cold leads into booked appointments in under 90 seconds.

## Guiding Principles

1. **Conversion above all** -- voice quality, low latency, and natural conversation are the product. If the AI sounds robotic, nothing else matters.
2. **Simple stack** -- CSV in, booked appointments out. No bloated CRM, no unnecessary middleware. The system does one thing and does it well.
3. **Productizable** -- built for one friend first, but every decision should support deploying this for a second client with minimal rework.
4. **Speed to lead** -- the value prop is calling leads fast. The system should be able to start dialing within seconds of receiving leads.

## What This Is

A lightweight orchestration layer that:
- Ingests leads (CSV upload for MVP, webhooks later)
- Triggers AI voice calls via a best-in-class voice platform
- Runs a qualifying real estate conversation using a cloned voice
- Books qualified leads onto a calendar
- Sends SMS reminders to reduce no-shows
- Retries unreachable leads 2-3 times before giving up

## What This Is Not

- Not a CRM -- it doesn't manage pipelines, deals, or long-term lead nurturing
- Not an ad platform -- it doesn't create or manage Meta ads
- Not a call center replacement -- it handles the initial qualifying call, then hands off to a human

## Long-term Direction

- Webhook ingestion from Meta Lead Ads, landing pages, etc.
- Dashboard for monitoring call outcomes, booking rates, conversion metrics
- Multi-tenant support for deploying across clients
- Warm transfer to human agents when leads request it
- Multi-industry support (home services, agencies, coaching) via configurable scripts
