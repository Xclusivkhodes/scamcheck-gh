#!/bin/sh
set -eu
if [ -n "${SPACE_ID:-}" ]; then
  PORT="${PORT:-7860}"
  if [ "$PORT" = "4317" ]; then
    PORT=7860
  fi
fi
export PORT="${PORT:-4317}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
exec node server.js
