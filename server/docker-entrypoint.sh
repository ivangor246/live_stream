#!/bin/sh

set -eu

poetry run alembic upgrade head
exec poetry run uvicorn app.main:app --host 0.0.0.0 --port 3000
