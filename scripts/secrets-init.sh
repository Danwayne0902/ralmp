#!/usr/bin/env bash
#
# Put APP_KEY and DB_PASSWORD into files under ./secrets (mode 600) for the
# docker-compose.secrets.yml overlay. Existing files are never overwritten.
#
# Values come from the environment, then backend/.env. If APP_KEY is missing,
# one is generated. DB_PASSWORD must already exist, because MySQL was
# initialised with it.

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
# shellcheck source=lib/db-env.sh
. "$ROOT_DIR/scripts/lib/db-env.sh"
load_db_env

SECRETS_DIR=${SECRETS_DIR:-$ROOT_DIR/secrets}
umask 077
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

write_secret() {
    local name=$1
    local value=$2
    local file="$SECRETS_DIR/$name"

    if [ -e "$file" ]; then
        echo "Keeping existing $file"
        return
    fi

    printf '%s' "$value" > "$file"
    chmod 600 "$file"
    echo "Wrote $file"
}

app_key=${APP_KEY:-}

if [ -z "$app_key" ] && [ -f "$ROOT_DIR/backend/.env" ]; then
    app_key=$(sed -n 's/^APP_KEY=//p' "$ROOT_DIR/backend/.env" | tail -n 1)
fi

if [ -z "$app_key" ]; then
    if command -v php >/dev/null 2>&1 && [ -f "$ROOT_DIR/backend/artisan" ]; then
        app_key=$(cd "$ROOT_DIR/backend" && php artisan key:generate --show)
    else
        app_key="base64:$(openssl rand -base64 32)"
    fi
fi

write_secret app_key "$app_key"

if [ -z "${DB_PASSWORD:-}" ]; then
    echo "DB_PASSWORD is empty. Set it in the environment or backend/.env first;" >&2
    echo "MySQL was initialised with that password, so it cannot be generated here." >&2
    exit 1
fi

write_secret db_password "$DB_PASSWORD"

echo
echo "Secrets are in $SECRETS_DIR (owner-only). Start the stack with:"
echo "  docker compose -f docker-compose.yml -f docker-compose.secrets.yml up -d"
