#!/usr/bin/env sh

set -eu

backup_input=${BACKUP:-}

if [ -z "$backup_input" ]; then
  printf '%s\n' 'Set BACKUP to a backup directory.' >&2
  exit 1
fi

if [ ! -d "$backup_input" ]; then
  printf 'Backup directory does not exist: %s\n' "$backup_input" >&2
  exit 1
fi

backup_directory=$(cd "$backup_input" && pwd)
manifest="$backup_directory/manifest.txt"
database_dump="$backup_directory/postgres.dump"
recordings_directory="$backup_directory/recordings"

if [ ! -f "$manifest" ] || [ ! -s "$database_dump" ] || [ ! -d "$recordings_directory" ]; then
  printf '%s\n' 'Backup must contain manifest.txt, a non-empty postgres.dump, and recordings/.' >&2
  exit 1
fi

if ! grep -qx 'database_dump=postgres.dump' "$manifest" || ! grep -qx 'recordings_directory=recordings' "$manifest"; then
  printf '%s\n' 'Backup manifest is not supported.' >&2
  exit 1
fi

for service in backend frontend mediamtx; do
  if docker compose ps --status running --services | grep -qx "$service"; then
    printf 'Stop the running application before restoring data (service: %s).\n' "$service" >&2
    exit 1
  fi
done

if [ "${RESTORE_DRY_RUN:-false}" = "true" ]; then
  printf 'Backup is ready to restore: %s\n' "$backup_directory"
  exit 0
fi

printf '%s\n' 'This permanently replaces the PostgreSQL database and all recordings.' >&2
printf '%s' 'Type RESTORE to continue: ' >&2
read -r confirmation

if [ "$confirmation" != "RESTORE" ]; then
  printf '%s\n' 'Restore cancelled.' >&2
  exit 1
fi

docker compose up -d postgres

attempt=0
until docker compose exec -T postgres sh -c 'pg_isready --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    printf '%s\n' 'PostgreSQL did not become ready in time.' >&2
    exit 1
  fi
  sleep 1
done

docker compose exec -T postgres sh -c \
  'dropdb --if-exists --force --username="$POSTGRES_USER" "$POSTGRES_DB" && createdb --username="$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T postgres sh -c \
  'pg_restore --exit-on-error --no-owner --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  < "$database_dump"
docker compose run --rm --no-deps --volume "$recordings_directory:/backup:ro" recordings-maintenance \
  'find /recordings -mindepth 1 -maxdepth 1 -exec rm -rf {} + && cp -a /backup/. /recordings/'

printf 'Restored database and recordings from: %s\n' "$backup_directory"
printf '%s\n' 'Restart the appropriate deployment with make docker-up or make https-up.'
