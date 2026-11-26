# Shared database settings for scripts/db-backup.sh and scripts/db-restore.sh.
# Environment variables win, then backend/.env, then the compose defaults.
# Source this file; do not run it.

load_db_env() {
    local env_file="${ENV_FILE:-$ROOT_DIR/backend/.env}"
    local key value

    for key in DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD; do
        if [ -n "${!key:-}" ]; then
            continue
        fi

        [ -f "$env_file" ] || continue

        value=$(sed -n "s/^${key}=//p" "$env_file" | tail -n 1)
        value=${value%\"}
        value=${value#\"}
        value=${value%\'}
        value=${value#\'}

        if [ -n "$value" ]; then
            export "$key=$value"
        fi
    done

    export DB_HOST="${DB_HOST:-mysql}"
    export DB_PORT="${DB_PORT:-3306}"
    export DB_DATABASE="${DB_DATABASE:-ramlp}"
    export DB_USERNAME="${DB_USERNAME:-root}"
    export DB_PASSWORD="${DB_PASSWORD:-}"
}

# Decides where a MySQL client should run: "direct" on this host, or "compose"
# inside the mysql container. A compose service host name only resolves inside
# the compose network, so prefer the container for those.
db_client_mode() {
    local tool=$1

    if command -v "$tool" >/dev/null 2>&1; then
        case "$DB_HOST" in
            mysql|db)
                if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
                    echo compose
                    return
                fi
                ;;
        esac

        echo direct
        return
    fi

    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        echo compose
        return
    fi

    echo none
}
