#!/bin/bash
# deploy.sh — pull latest main and restart the server
# Run this on the Mac Mini after SSHing in: bash deploy.sh

set -e

echo "[deploy] pulling latest main..."
git fetch origin
git checkout main
git pull origin main

echo "[deploy] installing dependencies..."
npm install --omit=dev

echo "[deploy] restarting server..."
pm2 restart devrun

echo "[deploy] done. Status:"
pm2 status devrun
