#!/usr/bin/env bash
#
# Run the API behind nginx + PHP-FPM on this machine, using the same pool
# settings as the container, so load tests measure the real serving path
# instead of `artisan serve`.
#
#   loadtest/fpm.sh start|stop|status
#
# Env: HTTP_PORT (8088), FPM_PORT (9100), REDIS_PORT (6391), RUN_DIR (/tmp/ramlp-fpm)

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
APP_ROOT="$ROOT_DIR/backend"
RUN_DIR=${RUN_DIR:-/tmp/ramlp-fpm}
HTTP_PORT=${HTTP_PORT:-8088}
FPM_PORT=${FPM_PORT:-9100}
REDIS_PORT=${REDIS_PORT:-6391}

find_php_fpm() {
    if [ -n "${PHP_FPM:-}" ]; then
        echo "$PHP_FPM"
        return
    fi

    local candidate
    for candidate in \
        /usr/local/opt/php@8.2/sbin/php-fpm \
        /opt/homebrew/opt/php@8.2/sbin/php-fpm \
        /usr/local/sbin/php-fpm \
        /opt/homebrew/sbin/php-fpm \
        "$(command -v php-fpm 2>/dev/null || true)"
    do
        if [ -n "$candidate" ] && [ -x "$candidate" ]; then
            echo "$candidate"
            return
        fi
    done

    echo "php-fpm was not found. Set PHP_FPM=/path/to/php-fpm." >&2
    exit 1
}

render() {
    local template=$1
    local target=$2

    sed \
        -e "s|__RUN_DIR__|$RUN_DIR|g" \
        -e "s|__APP_ROOT__|$APP_ROOT|g" \
        -e "s|__MIME_TYPES__|$RUN_DIR/mime.types|g" \
        -e "s|__HTTP_PORT__|$HTTP_PORT|g" \
        -e "s|__FPM_PORT__|$FPM_PORT|g" \
        "$template" > "$target"
}

healthy() {
    curl -fsS --max-time 3 "http://127.0.0.1:$HTTP_PORT/health" >/dev/null 2>&1
}

start() {
    if healthy; then
        echo "Already running: http://127.0.0.1:$HTTP_PORT"
        return
    fi

    mkdir -p "$RUN_DIR"

    # Drop a cached config so the exported drivers below take effect.
    ( cd "$APP_ROOT" && php artisan optimize:clear >/dev/null 2>&1 || true )

    if ! redis-cli -p "$REDIS_PORT" ping >/dev/null 2>&1; then
        redis-server \
            --port "$REDIS_PORT" \
            --daemonize yes \
            --save '' \
            --appendonly no \
            --dir "$RUN_DIR"
    fi

    cat > "$RUN_DIR/mime.types" <<'EOF'
types {
    text/html html htm;
    text/css css;
    application/javascript js;
    application/json json;
    image/png png;
    image/jpeg jpg jpeg;
    image/svg+xml svg;
    text/plain txt;
}
EOF

    render "$ROOT_DIR/loadtest/fpm/php-fpm.conf" "$RUN_DIR/php-fpm.conf"
    render "$ROOT_DIR/loadtest/fpm/nginx.conf" "$RUN_DIR/nginx.conf"

    # The pool inherits this environment (clear_env = no), which is how the
    # test mirrors the Redis-backed production stack. The throttle is lifted
    # only for the load test; the default stays 120 in production.
    export CACHE_DRIVER=${CACHE_DRIVER:-redis}
    export SESSION_DRIVER=${SESSION_DRIVER:-redis}
    export REDIS_PORT
    export API_RATE_LIMIT=${API_RATE_LIMIT:-0}

    # Pass them explicitly too: some php-fpm builds do not forward the master
    # environment to workers even with clear_env = no.
    cat >> "$RUN_DIR/php-fpm.conf" <<EOF
env[CACHE_DRIVER] = $CACHE_DRIVER
env[SESSION_DRIVER] = $SESSION_DRIVER
env[REDIS_PORT] = $REDIS_PORT
env[API_RATE_LIMIT] = $API_RATE_LIMIT
EOF

    "$(find_php_fpm)" --fpm-config "$RUN_DIR/php-fpm.conf"
    nginx -p "$RUN_DIR" -e "$RUN_DIR/nginx-error.log" -c "$RUN_DIR/nginx.conf"

    for _ in $(seq 1 40); do
        if healthy; then
            echo "nginx + PHP-FPM ready: http://127.0.0.1:$HTTP_PORT"
            echo "API base: http://127.0.0.1:$HTTP_PORT/api/v1"
            return
        fi
        sleep 0.5
    done

    echo "The stack did not become healthy. Check $RUN_DIR/nginx-error.log and $RUN_DIR/php-fpm-error.log" >&2
    exit 1
}

stop() {
    if [ -f "$RUN_DIR/nginx.conf" ]; then
        nginx -p "$RUN_DIR" -e "$RUN_DIR/nginx-error.log" -c "$RUN_DIR/nginx.conf" -s quit 2>/dev/null || true
    fi

    if [ -f "$RUN_DIR/php-fpm.pid" ]; then
        kill "$(cat "$RUN_DIR/php-fpm.pid")" 2>/dev/null || true
    fi

    redis-cli -p "$REDIS_PORT" shutdown nosave >/dev/null 2>&1 || true

    echo "Stopped."
}

status() {
    if healthy; then
        echo "Healthy: http://127.0.0.1:$HTTP_PORT"
    else
        echo "Not running."
        return 1
    fi
}

case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: loadtest/fpm.sh start|stop|status" >&2
        exit 1
        ;;
esac
