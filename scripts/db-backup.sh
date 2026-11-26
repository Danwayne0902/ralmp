#!/usr/bin/env bash
#
# Dump the MySQL database to a gzipped file, prune old copies and optionally
# copy the new one to object storage.
#
#   scripts/db-backup.sh [output-dir]
#
# Settings (environment or backend/.env):
#   DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
#   BACKUP_RETENTION_DAYS  delete local dumps older than this (default 14)
#   BACKUP_S3_URI          e.g. s3://my-bucket/ramlp/backups (needs the aws CLI)
#
# Uses a local mysqldump when one is installed, otherwise runs mysqldump inside
# the compose mysql container. Every dump is tested before it replaces the
# previous one, and the script fails loudly on a truncated or empty file.

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
# shellcheck source=lib/db-env.sh
. "$ROOT_DIR/scripts/lib/db-env.sh"
load_db_env

BACKUP_DIR=${1:-${BACKUP_DIR:-$ROOT_DIR/backups}}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
S3_URI=${BACKUP_S3_URI:-}

case "$RETENTION_DAYS" in
    ''|*[!0-9]*)
        echo "BACKUP_RETENTION_DAYS must be a whole number of days." >&2
        exit 1
        ;;
esac

mkdir -p "$BACKUP_DIR"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="$BACKUP_DIR/${DB_DATABASE}-${stamp}.sql.gz"
partial="$file.partial"

cleanup() {
    rm -f "$partial"
}
trap cleanup EXIT

dump_args=(
    --single-transaction
    --quick
    --skip-lock-tables
    --routines
    --triggers
    --events
    --no-tablespaces
    --default-character-set=utf8mb4
)

mode=$(db_client_mode mysqldump)

if [ "$mode" = "direct" ]; then
    # A GTID-enabled source otherwise writes GTID_PURGED, which a fresh restore
    # target rejects. MariaDB clients do not know the flag.
    if ! mysqldump --version 2>/dev/null | grep -qi mariadb; then
        dump_args+=(--set-gtid-purged=OFF)
    fi

    echo "Dumping $DB_DATABASE from $DB_HOST:$DB_PORT with the local mysqldump..."
    MYSQL_PWD="$DB_PASSWORD" mysqldump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --user="$DB_USERNAME" \
        "${dump_args[@]}" \
        "$DB_DATABASE" | gzip -9 > "$partial"
elif [ "$mode" = "compose" ]; then
    # The compose service is mysql:8.0, so the MySQL-only flag is safe.
    dump_args+=(--set-gtid-purged=OFF)

    echo "Dumping $DB_DATABASE with mysqldump inside the mysql container..."
    (
        cd "$ROOT_DIR"
        docker compose exec -T -e MYSQL_PWD="$DB_PASSWORD" mysql \
            mysqldump \
            --host=127.0.0.1 \
            --user="$DB_USERNAME" \
            "${dump_args[@]}" \
            "$DB_DATABASE"
    ) | gzip -9 > "$partial"
else
    echo "Neither mysqldump nor docker compose is available on this host." >&2
    exit 1
fi

if [ ! -s "$partial" ]; then
    echo "The dump is empty; keeping the previous backups." >&2
    exit 1
fi

if ! gzip -t "$partial" 2>/dev/null; then
    echo "The dump is not valid gzip; keeping the previous backups." >&2
    exit 1
fi

# mysqldump writes this marker only after every table is complete.
tail_marker=$(gzip -dc "$partial" | tail -n 5)
case "$tail_marker" in
    *"Dump completed"*) ;;
    *)
        echo "The dump has no completion marker, so it is truncated. Keeping the previous backups." >&2
        exit 1
        ;;
esac

mv "$partial" "$file"
trap - EXIT

echo "Backup written: $file ($(du -h "$file" | awk '{print $1}'))"

if [ -n "$S3_URI" ]; then
    if command -v aws >/dev/null 2>&1; then
        echo "Copying the backup to ${S3_URI%/}..."
        aws s3 cp "$file" "${S3_URI%/}/$(basename "$file")"
    else
        echo "BACKUP_S3_URI is set but the aws CLI is not installed; the backup stays local." >&2
    fi
else
    echo "Set BACKUP_S3_URI to keep a copy outside this host." >&2
fi

if [ "$RETENTION_DAYS" -gt 0 ]; then
    find "$BACKUP_DIR" \
        -maxdepth 1 \
        -type f \
        -name "${DB_DATABASE}-*.sql.gz" \
        -mtime +"$RETENTION_DAYS" \
        -print -delete
fi
