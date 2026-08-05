#!/usr/bin/env sh

set -eu

poetry_command=${POETRY:-poetry}
backend_pid=
frontend_pid=

cleanup() {
  exit_status=$?
  trap - INT TERM EXIT

  if [ -n "$backend_pid" ]; then
    kill "$backend_pid" 2>/dev/null || true
  fi
  if [ -n "$frontend_pid" ]; then
    kill "$frontend_pid" 2>/dev/null || true
  fi

  if [ -n "$backend_pid" ]; then
    wait "$backend_pid" 2>/dev/null || true
  fi
  if [ -n "$frontend_pid" ]; then
    wait "$frontend_pid" 2>/dev/null || true
  fi

  make db-down >/dev/null 2>&1 || true
  make media-down >/dev/null 2>&1 || true

  exit "$exit_status"
}

trap cleanup INT TERM EXIT

wait_for_postgres() {
  attempt=0
  printf '%s\n' 'Waiting for PostgreSQL...'

  until docker compose exec -T postgres sh -c \
    'pg_isready --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
      printf '%s\n' 'PostgreSQL did not become ready in time.' >&2
      return 1
    fi
    sleep 1
  done
}

make db-up
MEDIA_AUTH_URL="${MEDIA_AUTH_URL:-http://host.docker.internal:3000/api/media/auth}" make media-up
wait_for_postgres

(
  cd server
  "$poetry_command" run alembic upgrade head
  exec "$poetry_command" run uvicorn app.main:app --reload --host 0.0.0.0 --port 3000 --no-access-log
) &
backend_pid=$!

(
  cd client
  exec npm run dev -- --host 0.0.0.0
) &
frontend_pid=$!

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done

exit_status=0
if ! kill -0 "$backend_pid" 2>/dev/null; then
  wait "$backend_pid" || exit_status=$?
else
  wait "$frontend_pid" || exit_status=$?
fi

exit "$exit_status"
