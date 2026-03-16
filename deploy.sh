#!/bin/bash
set -e
cd app
npm ci --omit=dev
npm run build
pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js
