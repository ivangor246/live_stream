#!/usr/bin/env sh

set -eu

backup_root=${BACKUP_DIR:-backups}
timestamp=$(date -u "+%Y%m%dT%H%M%SZ")
backup_directory="$backup_root/$timestamp"

if [ -e "$backup_directory" ]; then
  printf 'Backup directory already exists: %s\n' "$backup_directory" >&2
  exit 1
fi

for service in postgres mediamtx; do
  if ! docker compose ps --status running --services | grep -qx "$service"; then
    printf 'The %s service must be running before creating a backup.\n' "$service" >&2
    exit 1
  fi
done

mkdir -p "$backup_directory"

docker compose exec -T postgres sh -c \
  'pg_dump --format=custom --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  > "$backup_directory/postgres.dump"
mkdir -p "$backup_directory/recordings"
docker compose cp mediamtx:/recordings/. "$backup_directory/recordings"

printf '%s\n' \
  "created_at=$timestamp" \
  'database_dump=postgres.dump' \
  'recordings_directory=recordings' \
  > "$backup_directory/manifest.txt"

printf 'Backup created: %s\n' "$backup_directory"
