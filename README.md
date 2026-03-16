# SuperFluffer

Multi-tenant AI voice caller that turns cold leads into booked appointments. Each client gets their own AI voice agent, phone number, and calendar.

## Stack

- Next.js (app router)
- Postgres + Drizzle ORM
- Clerk (auth)
- Retell.ai (voice calls, TTS, SMS)
- Cal.com (calendar booking)
- pm2 + Traefik (deployment)

## Prerequisites

- Node.js 20+
- Postgres 16+
- Retell.ai account + API key
- Clerk application (publishable + secret keys)

## Setup

```bash
git clone <repo> && cd superfluffer/app
npm install
cp .env.example .env   # fill in values below
npx drizzle-kit push    # create tables
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (`postgresql://user:pass@host:5432/superfluffer`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `RETELL_API_KEY` | Retell.ai API key |
| `RETELL_WEBHOOK_SECRET` | HMAC secret for verifying Retell webhooks |
| `CRON_SECRET` | Secret for protecting the retry cron endpoint |

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/clients` | List active clients |
| GET | `/api/batches?clientId=X` | List batches for a client |
| POST | `/api/batches` | Create batch + leads, triggers calls |
| GET | `/api/leads?clientId=X&batchId=Y` | List leads |
| POST | `/api/retell/webhook` | Retell webhook (HMAC verified) |
| GET | `/api/cron/retries` | Retry unreachable leads (protected by CRON_SECRET) |

## Deployment (byldr VPS)

### First-time setup

1. SSH into byldr
2. Clone the repo: `git clone <repo> && cd superfluffer`
3. Create `app/.env` with the environment variables above
4. Create the Postgres database and run schema push:
   ```bash
   cd app && npx drizzle-kit push
   ```
5. Run the deploy script:
   ```bash
   ./deploy.sh
   ```
6. Symlink the Traefik config into Traefik's file provider directory:
   ```bash
   ln -s /path/to/superfluffer/traefik/superfluffer.yml /path/to/traefik/dynamic/superfluffer.yml
   ```
7. Point DNS for `superfluffer.byldr.co` to the byldr VPS IP

### Updating

```bash
git pull
./deploy.sh
```

This runs `npm ci`, builds the app, and restarts the pm2 process.
