#!/bin/sh
# reset.sh — truncate a skill's log back to Genesis.
#
# A skill's log is append-only in production. For CI and regression tests we
# want to fork it back to the initial state — just the first line (Genesis)
# — run a scenario, and assert the terminal state. Don't run this on a log
# you care about keeping.
#
# Usage: ./reset.sh <path/to/log.jsonl>
set -e

LOG="$1"
if [ -z "$LOG" ]; then
  echo "usage: reset.sh <path/to/log.jsonl>" >&2
  exit 2
fi
if [ ! -f "$LOG" ]; then
  echo "reset.sh: no such log: $LOG" >&2
  exit 1
fi

# Keep the first line only; it's Genesis by convention.
GENESIS=$(head -n 1 "$LOG")
if [ -z "$GENESIS" ]; then
  echo "reset.sh: log is empty, nothing to keep" >&2
  exit 1
fi

KIND=$(printf '%s' "$GENESIS" | sed -n 's/.*"kind":"\([^"]*\)".*/\1/p')
if [ "$KIND" != "Genesis" ]; then
  echo "reset.sh: first line kind=$KIND, expected Genesis — refusing" >&2
  exit 1
fi

printf '%s\n' "$GENESIS" > "$LOG"
echo "[reset] $LOG truncated to Genesis"
