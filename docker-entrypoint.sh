#!/bin/sh
set -eu

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

# Started as root: hand /data to the requested user, then drop privileges.
if [ "$(id -u)" = "0" ]; then
  if [ "$PUID" = "0" ] || [ "$PGID" = "0" ]; then
    echo "Refusing to run as root: set PUID and PGID to non-zero values." >&2
    exit 1
  fi
  chown -R "$PUID:$PGID" /data
  exec su-exec "$PUID:$PGID" "$@"
fi

exec "$@"
