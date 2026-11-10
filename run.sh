#!/usr/bin/env bash
# Starts the FundiLink API (and the website at /app/) from a fresh clone.
# Usage:  ./run.sh        (Windows: run.cmd)
set -e
cd "$(dirname "$0")/server"
if [ ! -f .env ]; then
  echo "No server/.env yet. Copy server/.env.example to server/.env and fill in your values (see README)."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Installing server packages (first run only)..."
  npm install
fi
exec node index.js
