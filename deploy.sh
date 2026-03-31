#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$REPO_DIR/app"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
MAX_RETRIES=10
RETRY_DELAY=3

cd "$REPO_DIR"

echo "==> Pulling latest from origin/main..."
PREV_COMMIT=$(git rev-parse HEAD)
git pull origin main

echo "==> Installing dependencies..."
cd "$APP_DIR"
npm ci

echo "==> Running database migrations..."
./node_modules/.bin/drizzle-kit push --force

echo "==> Building..."
npm run build

echo "==> Pruning dev dependencies..."
npm prune --omit=dev

echo "==> Restarting pm2..."
cd "$REPO_DIR"
pm2 restart superfluffer --update-env || pm2 start ecosystem.config.js --only superfluffer

echo "==> Health check..."
HEALTHY=false
for i in $(seq 1 $MAX_RETRIES); do
  sleep $RETRY_DELAY
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_STATUS" = "200" ]; then
    HEALTHY=true
    echo "    Health check passed (attempt $i)"
    break
  fi
  echo "    Attempt $i/$MAX_RETRIES: status=$HTTP_STATUS"
done

if [ "$HEALTHY" = "true" ]; then
  echo "==> Deploy successful! $(git rev-parse --short HEAD)"
  exit 0
fi

echo "==> UNHEALTHY — rolling back to $PREV_COMMIT"
cd "$REPO_DIR"
git checkout "$PREV_COMMIT"
cd "$APP_DIR"
npm ci --omit=dev
npm run build
cd "$REPO_DIR"
pm2 restart ecosystem.config.js --update-env
echo "==> Rolled back to $(git rev-parse --short HEAD)"
exit 1
