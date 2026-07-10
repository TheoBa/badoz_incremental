#!/usr/bin/env bash
# deploy.sh — pull latest main into a dedicated prod directory.
# Run this on the mac mini whenever you want to deploy.
# Then restart the server: cd ~/badoz_prod && npm start
set -euo pipefail

PROD_DIR="$HOME/badoz_prod"
REMOTE="$(git remote get-url origin)"

if [ ! -d "$PROD_DIR/.git" ]; then
  echo "→ first deploy — cloning $REMOTE"
  git clone "$REMOTE" "$PROD_DIR"
fi

echo "→ pulling origin/main into $PROD_DIR"
git -C "$PROD_DIR" fetch origin
git -C "$PROD_DIR" checkout main 2>/dev/null || git -C "$PROD_DIR" checkout -b main --track origin/main
git -C "$PROD_DIR" reset --hard origin/main

echo ""
echo "✓  $(git -C "$PROD_DIR" log -1 --oneline)"
echo ""
echo "   kill existing server if running: lsof -i :3000 -t | xargs kill 2>/dev/null || true"
echo "   then: cd $PROD_DIR && npm start"
