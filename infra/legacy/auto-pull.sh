#!/bin/bash
# auto-pull.sh — checks origin/main for new commits and deploys if found
# Runs via cron; logs to ~/.pm2/logs/auto-pull.log

set -e

REPO="/Users/theobadoz/Documents/repos/badoz_incremental"
LOG="$HOME/.pm2/logs/auto-pull.log"

cd "$REPO"

git fetch origin main --quiet

LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

echo "[auto-pull] $(date): new commits on main ($LOCAL → $REMOTE), deploying..." >> "$LOG"

git checkout main
git pull origin main

npm install --omit=dev --silent

pm2 restart devrun

echo "[auto-pull] $(date): done" >> "$LOG"
