#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-low-traffic}"
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$BASE_DIR/../../../.." && pwd)"
SERVER_DIR="$ROOT_DIR/apps/server"
PROFILE_FILE="$BASE_DIR/profiles/${PROFILE}.env"

if [[ ! -f "$PROFILE_FILE" ]]; then
  echo "Unknown profile: $PROFILE"
  exit 1
fi

set -a
source "$PROFILE_FILE"
set +a

export BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "Running baseline profile: $PROFILE"
echo "Using BASE_URL=$BASE_URL"

if [[ "$PROFILE" == "retry-storm" ]]; then
  (cd "$ROOT_DIR" && ./node_modules/.bin/tsx apps/server/scripts/load/retry-storm.ts)
else
  (cd "$ROOT_DIR" && ./node_modules/.bin/tsx apps/server/scripts/load/webhook-storm.ts)
fi
