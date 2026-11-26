#!/bin/sh
set -e

cd /app

# Load any secrets mounted as files (APP_KEY_FILE, DB_PASSWORD_FILE, ...)
# before Laravel reads its environment.
. ./docker/secrets.sh
load_secret_files

# The image ships without a .env (it is dockerignored). Build one from the
# example on first boot; real configuration arrives as container env vars.
if [ ! -f .env ]; then
    cp .env.example .env
fi

# A missing key is fatal for encrypted sessions and signed cookies. Generate
# one on first boot and keep it in a shared volume so the web and queue
# containers use the same value. Set APP_KEY in production to manage it yourself.
if [ -z "${APP_KEY:-}" ]; then
    if grep -q '^APP_KEY=base64:' .env; then
        APP_KEY=$(sed -n 's/^APP_KEY=//p' .env | head -n 1)
        export APP_KEY
    else
        KEY_FILE="${APP_KEY_FILE:-/app/.keys/app.key}"
        mkdir -p "$(dirname "$KEY_FILE")"

        if [ -s "$KEY_FILE" ]; then
            APP_KEY=$(cat "$KEY_FILE")
        else
            GENERATED_KEY=$(php artisan key:generate --show)
            if (set -C; printf '%s' "$GENERATED_KEY" > "$KEY_FILE") 2>/dev/null; then
                APP_KEY=$GENERATED_KEY
            else
                # Another container wrote the key first; use that one.
                APP_KEY=$(cat "$KEY_FILE")
            fi
        fi

        export APP_KEY
    fi
fi

# Wait for the database before any schema work.
if [ "${DB_CONNECTION:-mysql}" = "mysql" ]; then
    echo "Waiting for MySQL at ${DB_HOST:-mysql}:${DB_PORT:-3306}..."
    i=0
    until php -r '
        try {
            new PDO(
                sprintf("mysql:host=%s;port=%s;dbname=%s", getenv("DB_HOST") ?: "mysql", getenv("DB_PORT") ?: "3306", getenv("DB_DATABASE") ?: "ramlp"),
                getenv("DB_USERNAME") ?: "root",
                getenv("DB_PASSWORD") ?: ""
            );
            exit(0);
        } catch (Throwable $e) {
            exit(1);
        }
    '; do
        i=$((i + 1))
        if [ "$i" -ge 60 ]; then
            echo "MySQL did not become ready in time." >&2
            exit 1
        fi
        sleep 1
    done
fi

# Cache, sessions and queues all share Redis in this stack, so wait for it too.
case "${CACHE_DRIVER:-file}:${SESSION_DRIVER:-file}:${QUEUE_CONNECTION:-sync}" in
    *redis*)
        echo "Waiting for Redis at ${REDIS_HOST:-redis}:${REDIS_PORT:-6379}..."
        i=0
        until php -r '
            try {
                $redis = new Redis();
                $redis->connect(getenv("REDIS_HOST") ?: "redis", (int) (getenv("REDIS_PORT") ?: 6379), 1.0);
                if ($password = getenv("REDIS_PASSWORD")) {
                    $redis->auth($password);
                }
                $redis->ping();
                exit(0);
            } catch (Throwable $e) {
                exit(1);
            }
        '; do
            i=$((i + 1))
            if [ "$i" -ge 60 ]; then
                echo "Redis did not become ready in time." >&2
                exit 1
            fi
            sleep 1
        done
        ;;
esac

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
# php-fpm runs as www-data; it must own the writable framework directories.
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R ug+rwX storage bootstrap/cache

# Only the web container migrates, so replicas and the worker never race.
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
    php artisan storage:link || true
    php artisan migrate --force
    # Registration assigns a role, so a fresh database needs these rows before
    # it can accept users. The seeder is idempotent and contains no demo users.
    php artisan db:seed --class=PermissionsSeeder --force
fi

if [ "${APP_ENV:-production}" = "production" ]; then
    php artisan config:cache
    # Laravel 12 can cache closure routes, so this succeeds; it cuts route
    # matching per request. Fall back to a clear if a route cannot be cached.
    php artisan route:cache || php artisan route:clear || true
    php artisan view:cache || true
else
    php artisan config:clear >/dev/null 2>&1 || true
fi

# Long-running workers should pick up new code on restart.
if [ "${RESET_QUEUES:-0}" = "1" ]; then
    php artisan queue:restart || true
fi

exec "$@"
