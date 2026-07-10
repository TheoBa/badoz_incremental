#!/usr/bin/env bash
# auto-deploy.sh — cron entry point: deploy + restart prod when origin/main moves.
# Wraps infra/deploy.sh with change detection and a server restart.
# Replaces the legacy root auto-pull.sh (see infra/legacy/).
#
# The crontab MUST point at the ~/badoz_prod copy, not the dev working tree:
# macOS TCC blocks cron from reading anything under ~/Documents (this is why
# the legacy auto-pull cron never worked — 941 "Operation not permitted"
# failures in its log). ~/badoz_prod is outside TCC scope and the copy there
# self-updates on every deploy.
#
# Crontab:
#   */5 * * * * $HOME/badoz_prod/infra/auto-deploy.sh >> $HOME/Library/Logs/badoz/auto-deploy.log 2>&1
set -euo pipefail

PROD_DIR="$HOME/badoz_prod"
PORT=3000
LOCK="${TMPDIR:-/tmp}/badoz-auto-deploy.lock"
LOG_DIR="$HOME/Library/Logs/badoz"

# Never overlap with a still-running deploy (npm install can outlast the cron interval)
if ! mkdir "$LOCK" 2>/dev/null; then exit 0; fi
trap 'rmdir "$LOCK"' EXIT

# Exit quietly unless origin/main moved past what prod serves
if [ -d "$PROD_DIR/.git" ]; then
  git -C "$PROD_DIR" fetch origin main --quiet
  if [ "$(git -C "$PROD_DIR" rev-parse HEAD)" = "$(git -C "$PROD_DIR" rev-parse origin/main)" ]; then
    exit 0
  fi
fi

echo "[auto-deploy] $(date): new commits on origin/main — deploying"

# deploy.sh handles clone-if-missing, reset to origin/main, npm install.
# It resolves the remote from its cwd, so run it from the repo root.
cd "$(dirname "$0")/.."
bash infra/deploy.sh

# Restart the server from the prod dir
pids="$(lsof -i :$PORT -t 2>/dev/null || true)"
if [ -n "$pids" ]; then
  kill $pids
  sleep 1
fi
mkdir -p "$LOG_DIR"
cd "$PROD_DIR"
nohup npm start >> "$LOG_DIR/server.log" 2>&1 &
echo "[auto-deploy] $(date): restarted — $(git -C "$PROD_DIR" log -1 --oneline)"
