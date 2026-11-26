#!/bin/sh
# Export secrets that the platform mounts as files (Docker secrets, Kubernetes
# secret volumes, systemd credentials). Each VAR_FILE points at a file whose
# contents become VAR, so values never appear in `docker inspect` or the
# compose file.
#
# Sourced by docker/entrypoint.sh before Laravel starts.

load_secret_files() {
    for var in \
        APP_KEY \
        DB_PASSWORD \
        REDIS_PASSWORD \
        PAYSTACK_PUBLIC_KEY \
        PAYSTACK_SECRET_KEY \
        MAIL_PASSWORD \
        AWS_ACCESS_KEY_ID \
        AWS_SECRET_ACCESS_KEY \
        PUSHER_APP_SECRET
    do
        eval "file=\${${var}_FILE:-}"

        [ -n "$file" ] || continue

        if [ ! -r "$file" ]; then
            echo "Secret file for $var is not readable: $file" >&2
            exit 1
        fi

        # Secret stores usually end the file with a newline; strip it.
        value=$(cat "$file")

        if [ -z "$value" ]; then
            echo "Secret file for $var is empty: $file" >&2
            exit 1
        fi

        export "$var=$value"
    done
}
