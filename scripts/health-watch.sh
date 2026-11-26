#!/usr/bin/env bash
#
# One health probe, meant for cron or a systemd timer.
#
#   scripts/health-watch.sh [url]
#
# Exit 0 when healthy, 1 when unhealthy (after retries). Alerts only on a
# change of state, so a permanently down service does not page every minute.
#
# Environment:
#   HEALTH_URL         default http://127.0.0.1:8000/health
#   HEALTH_RETRIES     attempts per run (default 3)
#   HEALTH_DELAY       seconds between attempts (default 5)
#   HEALTH_TIMEOUT     seconds per request (default 10)
#   ALERT_WEBHOOK      optional URL; receives a Slack-compatible {"text": ...}
#   HEALTH_STATE_FILE  remembers the last result (default /tmp/ramlp-health.state)
#   HOST_LABEL         name used in alerts (default: hostname)

set -euo pipefail

URL=${HEALTH_URL:-${1:-http://127.0.0.1:8000/health}}
RETRIES=${HEALTH_RETRIES:-3}
DELAY=${HEALTH_DELAY:-5}
TIMEOUT=${HEALTH_TIMEOUT:-10}
WEBHOOK=${ALERT_WEBHOOK:-}
LABEL=${HOST_LABEL:-$(hostname)}
STATE_FILE=${HEALTH_STATE_FILE:-${TMPDIR:-/tmp}/ramlp-health.state}

check() {
    local body code
    body=$(mktemp)

    code=$(curl -sS -o "$body" -w '%{http_code}' --max-time "$TIMEOUT" "$URL" 2>/dev/null || echo 000)

    if [ "$code" = "200" ] && grep -q '"status":"ok"' "$body"; then
        rm -f "$body"
        return 0
    fi

    rm -f "$body"
    return 1
}

alert() {
    local message=$1
    local escaped

    [ -n "$WEBHOOK" ] || return 0

    escaped=$(printf '%s' "$message" | sed 's/\\/\\\\/g; s/"/\\"/g')

    if ! curl -fsS --max-time 10 -X POST \
        -H 'Content-Type: application/json' \
        --data "{\"text\":\"$escaped\"}" \
        "$WEBHOOK" >/dev/null 2>&1; then
        echo "Could not deliver the alert to $WEBHOOK" >&2
    fi
}

healthy=0
for attempt in $(seq 1 "$RETRIES"); do
    if check; then
        healthy=1
        break
    fi

    if [ "$attempt" -lt "$RETRIES" ]; then
        sleep "$DELAY"
    fi
done

previous=up
if [ -f "$STATE_FILE" ]; then
    previous=$(cat "$STATE_FILE")
fi

mkdir -p "$(dirname "$STATE_FILE")" 2>/dev/null || true

if [ "$healthy" -eq 1 ]; then
    if [ "$previous" = "down" ]; then
        echo "[$(date -u +%FT%TZ)] $LABEL recovered: $URL"
        alert "RECOVERED: $LABEL is healthy again ($URL)"
    else
        echo "[$(date -u +%FT%TZ)] $LABEL healthy: $URL"
    fi

    printf 'up' > "$STATE_FILE"
    exit 0
fi

echo "[$(date -u +%FT%TZ)] $LABEL is DOWN: no healthy response from $URL after $RETRIES attempts" >&2

if [ "$previous" != "down" ]; then
    alert "DOWN: $LABEL failed its health check ($URL)"
fi

printf 'down' > "$STATE_FILE"
exit 1
