#!/usr/bin/env bash
set -e

PORT=8080

# Firebase Studio sets this env var
if [ -n "$FIREBASE_STUDIO" ] || [ -n "$IDX_WORKSPACE_ID" ]; then
  echo "🟢 Firebase Studio detected — letting Studio manage Next.js"
  exit 0
fi

echo "🧹 Cleaning stale Next.js processes and locks..."

pkill -f "next dev" || true
pkill -f "next-server" || true

if ss -lntp | grep -q ":$PORT "; then
  echo "⚠️ Port $PORT still in use, force killing owner..."
  ss -lntp | grep ":$PORT " | awk '{print $7}' | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill -9
fi

rm -f .next/dev/lock

echo "🚀 Starting Next.js on 0.0.0.0:$PORT"
exec next dev -H 0.0.0.0 -p $PORT
