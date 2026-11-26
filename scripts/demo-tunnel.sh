#!/usr/bin/env bash
#
# Put the demo online for a short while, without a server or an account:
# nginx serves the built React app and proxies the API on one port, and a
# Cloudflare quick tunnel exposes that port as a public HTTPS URL.
#
#   scripts/demo-tunnel.sh start   # builds the frontend if needed, starts both
#   scripts/demo-tunnel.sh url     # print the current public URL
#   scripts/demo-tunnel.sh stop
#
# Requirements: nginx, cloudflared (`brew install cloudflared`), node/npm, and
# the Laravel app already running on API_PORT (default 8000).
#
# This is a demo, not a deployment: the URL is random, dies with the process,
# and the machine must stay awake.

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
RUN_DIR=${RUN_DIR:-/tmp/ramlp-demo}
PORT=${PORT:-8080}
API_PORT=${API_PORT:-8000}
DIST="$ROOT_DIR/frontend-react/dist"

url_file="$RUN_DIR/public-url"
log_file="$RUN_DIR/cloudflared.log"

need() {
    command -v "$1" >/dev/null 2>&1 || {
        echo "$1 is required. $2" >&2
        exit 1
    }
}

build_frontend() {
    if [ -f "$DIST/index.html" ] && [ -z "${FORCE_BUILD:-}" ]; then
        return
    fi

    echo "Building the frontend (API calls go to /api/v1 on the same origin)..."
    ( cd "$ROOT_DIR/frontend-react" && VITE_API_URL=/api/v1 npm run build )
}

write_mime_types() {
    cat > "$RUN_DIR/mime.types" <<'EOF'
types {
    text/html html htm;
    text/css css;
    application/javascript js mjs;
    application/json json;
    image/png png;
    image/jpeg jpg jpeg;
    image/svg+xml svg;
    image/webp webp;
    image/x-icon ico;
    font/woff woff;
    font/woff2 woff2;
    text/plain txt;
}
EOF
}

set_app_url() {
    local url=$1
    local env_file="$ROOT_DIR/backend/.env"

    [ -f "$env_file" ] || return 0

    if grep -q '^APP_URL=' "$env_file"; then
        sed -i.bak "s|^APP_URL=.*|APP_URL=$url|" "$env_file"
        rm -f "$env_file.bak"
    else
        printf '\nAPP_URL=%s\n' "$url" >> "$env_file"
    fi

    # Quick-tunnel URLs change on every start, so Laravel must not cache one.
    ( cd "$ROOT_DIR/backend" && php artisan optimize:clear >/dev/null 2>&1 || true )
    echo "APP_URL updated in backend/.env"
}

start() {
    need nginx "Install it with: brew install nginx"
    need cloudflared "Install it with: brew install cloudflared"

    mkdir -p "$RUN_DIR"
    build_frontend
    write_mime_types

    sed \
        -e "s|__RUN_DIR__|$RUN_DIR|g" \
        -e "s|__DIST__|$DIST|g" \
        -e "s|__MIME_TYPES__|$RUN_DIR/mime.types|g" \
        -e "s|__PORT__|$PORT|g" \
        -e "s|__API_PORT__|$API_PORT|g" \
        "$ROOT_DIR/deploy/demo/nginx.conf" > "$RUN_DIR/nginx.conf"

    if ! curl -fsS --max-time 3 "http://127.0.0.1:$API_PORT/health" >/dev/null 2>&1; then
        echo "The API is not answering on http://127.0.0.1:$API_PORT/health." >&2
        echo "Start it first: cd backend && php artisan serve --host=127.0.0.1 --port=$API_PORT" >&2
        exit 1
    fi

    if ! curl -fsS --max-time 3 "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
        nginx -p "$RUN_DIR" -e "$RUN_DIR/nginx-error.log" -c "$RUN_DIR/nginx.conf"
    fi

    if [ -f "$RUN_DIR/cloudflared.pid" ] && kill -0 "$(cat "$RUN_DIR/cloudflared.pid")" 2>/dev/null; then
        echo "Tunnel already running."
    else
        rm -f "$url_file"
        : > "$log_file"
        cloudflared tunnel --url "http://127.0.0.1:$PORT" \
            --logfile "$log_file" --pidfile "$RUN_DIR/cloudflared.pid" \
            --no-autoupdate >/dev/null 2>&1 &

        for _ in $(seq 1 40); do
            if grep -qoE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log_file"; then
                grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log_file" | head -1 > "$url_file"
                break
            fi
            sleep 0.5
        done
    fi

    if [ ! -s "$url_file" ]; then
        echo "The tunnel did not produce a URL. See $log_file" >&2
        exit 1
    fi

    echo "Public URL: $(cat "$url_file")"
    set_app_url "$(cat "$url_file")"
    echo "Set APP_URL to it in backend/.env, then run: cd backend && php artisan optimize:clear"
}

stop() {
    if [ -f "$RUN_DIR/cloudflared.pid" ]; then
        kill "$(cat "$RUN_DIR/cloudflared.pid")" 2>/dev/null || true
        rm -f "$RUN_DIR/cloudflared.pid"
    fi

    if [ -f "$RUN_DIR/nginx.conf" ]; then
        nginx -p "$RUN_DIR" -e "$RUN_DIR/nginx-error.log" -c "$RUN_DIR/nginx.conf" -s quit 2>/dev/null || true
    fi

    rm -f "$url_file"
    echo "Stopped."
}

case "${1:-}" in
    start) start ;;
    stop) stop ;;
    url)
        if [ -s "$url_file" ]; then
            cat "$url_file"
        else
            echo "No tunnel is running." >&2
            exit 1
        fi
        ;;
    *)
        echo "Usage: scripts/demo-tunnel.sh start|url|stop" >&2
        exit 1
        ;;
esac
