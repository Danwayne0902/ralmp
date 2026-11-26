#!/usr/bin/env bash
#
# Restore a dump produced by scripts/db-backup.sh.
#
#   scripts/db-restore.sh <dump.sql.gz> [target-database] [--force] [--strict]
#
# The default target is "<database>_restore", so a restore drill never touches
# live data. Restoring over the live database needs --force. When the source
# database still exists, every table's row count is compared afterwards; a
# difference is a warning unless --strict is given (useful on an idle host or
# in CI, where a difference always means the restore is wrong).

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
# shellcheck source=lib/db-env.sh
. "$ROOT_DIR/scripts/lib/db-env.sh"
load_db_env

usage() {
    cat <<'EOF'
Usage: scripts/db-restore.sh <dump.sql.gz> [target-database] [--force] [--strict]

  target-database  defaults to <DB_DATABASE>_restore
  --force          allow restoring over the live database
  --strict         fail when restored row counts differ from the source
EOF
}

force=0
strict=0
args=()
for arg in "$@"; do
    case "$arg" in
        --force)
            force=1
            ;;
        --strict)
            strict=1
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            args+=("$arg")
            ;;
    esac
done

if [ "${#args[@]}" -lt 1 ]; then
    usage >&2
    exit 1
fi

dump=${args[0]}
target=${args[1]:-${DB_DATABASE}_restore}

if [ ! -f "$dump" ]; then
    echo "No such dump: $dump" >&2
    exit 1
fi

case "$dump" in
    *.gz) ;;
    *)
        echo "Expected a gzipped dump (.sql.gz)." >&2
        exit 1
        ;;
esac

if ! gzip -t "$dump" 2>/dev/null; then
    echo "$dump is not valid gzip." >&2
    exit 1
fi

case "$target" in
    ''|*[!A-Za-z0-9_]*)
        echo "Invalid database name: $target" >&2
        exit 1
        ;;
esac

if [ "$target" = "$DB_DATABASE" ] && [ "$force" -ne 1 ]; then
    echo "Refusing to overwrite the live database '$DB_DATABASE' without --force." >&2
    exit 1
fi

mode=$(db_client_mode mysql)

if [ "$mode" = "direct" ]; then
    echo "Using the local mysql client against $DB_HOST:$DB_PORT..."
    run_mysql() {
        ( cd "$ROOT_DIR" && MYSQL_PWD="$DB_PASSWORD" mysql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --user="$DB_USERNAME" \
            "$@" )
    }
elif [ "$mode" = "compose" ]; then
    echo "Using the mysql client inside the compose container..."
    run_mysql() {
        ( cd "$ROOT_DIR" && docker compose exec -T -e MYSQL_PWD="$DB_PASSWORD" mysql \
            mysql \
            --host=127.0.0.1 \
            --user="$DB_USERNAME" \
            "$@" )
    }
else
    echo "Neither the mysql client nor docker compose is available on this host." >&2
    exit 1
fi

echo "Creating database $target if it does not exist..."
printf 'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n' "$target" | run_mysql

echo "Restoring $dump into $target..."
gzip -dc "$dump" | run_mysql "$target"

table_count=$(printf "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '%s' AND table_type = 'BASE TABLE';\n" "$target" | run_mysql --skip-column-names --batch)

if [ -z "$table_count" ] || [ "$table_count" -eq 0 ]; then
    echo "The restore produced no tables." >&2
    exit 1
fi

echo "Restored $table_count tables into $target."

# A restore drill is only proven when the row counts match the source.
source_exists=$(printf "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = '%s';\n" "$DB_DATABASE" | run_mysql --skip-column-names --batch 2>/dev/null || true)

if [ "$target" != "$DB_DATABASE" ] && [ "${source_exists:-0}" = "1" ]; then
    tables=$(printf "SELECT table_name FROM information_schema.tables WHERE table_schema = '%s' AND table_type = 'BASE TABLE' ORDER BY table_name;\n" "$target" | run_mysql --skip-column-names --batch)

    query=""
    for table in $tables; do
        query+="SELECT '$table', COUNT(*) FROM \`$table\` UNION ALL "
    done
    query=${query% UNION ALL }

    counts_source=$(mktemp)
    counts_restored=$(mktemp)
    trap 'rm -f "$counts_source" "$counts_restored"' EXIT

    printf '%s;\n' "$query" | run_mysql --skip-column-names --batch "$DB_DATABASE" | sort > "$counts_source"
    printf '%s;\n' "$query" | run_mysql --skip-column-names --batch "$target" | sort > "$counts_restored"

    if diff -u "$counts_source" "$counts_restored" > /dev/null; then
        echo "Row counts match $DB_DATABASE for all $table_count tables."
    else
        echo "Row counts differ between $DB_DATABASE and $target:" >&2
        diff -u "$counts_source" "$counts_restored" >&2 || true

        if [ "$strict" -eq 1 ]; then
            echo "Failing because --strict was given." >&2
            exit 1
        fi

        echo "Rows can change while the restore runs; use --strict on an idle database." >&2
    fi
fi

echo "Restore complete: $target"
