SHELL := /bin/sh

POETRY ?= poetry
HTTPS_COMPOSE = docker compose --env-file deploy/.env.https -f docker-compose.yml -f docker-compose.https.yml

.PHONY: help install install-frontend install-backend db-up db-down db-migrate media-up media-down backup \
        dev-frontend dev-backend lint build backend-check backend-test docker-build docker-up \
        docker-down docker-logs up down start stop restart logs https-up https-down restore

help:
	@printf '%s\n' \
		'make up               Build and start the complete Docker stack in the background' \
		'make down             Stop and remove the complete Docker stack' \
		'make start            Alias for make up' \
		'make stop             Alias for make down' \
		'make restart          Recreate the complete Docker stack' \
		'make logs             Follow logs from all Docker services' \
		'make install          Install frontend and backend dependencies' \
		'make dev-frontend     Start the Vite development server' \
		'make db-up            Start the local PostgreSQL service' \
		'make db-down          Stop the local PostgreSQL service' \
		'make db-migrate       Apply PostgreSQL migrations' \
		'make backup           Save PostgreSQL and recordings to BACKUP_DIR (default: backups)' \
		'make restore BACKUP=… Replace data with a confirmed local backup' \
		'make media-up         Start the local MediaMTX service' \
		'make media-down       Stop the local MediaMTX service' \
		'make dev-backend      Migrate and start the FastAPI server' \
		'make lint             Run frontend and backend lint checks' \
		'make build            Build the frontend' \
		'make backend-check    Compile-check the backend' \
		'make backend-test     Run backend regression tests' \
		'make docker-build     Build both Docker images' \
		'make docker-up        Build and start the complete Docker stack (alias for make up)' \
		'make docker-down      Stop and remove the complete Docker stack (alias for make down)' \
		'make docker-logs      Follow Docker service logs (alias for make logs)' \
		'make https-up         Start the HTTPS deployment from deploy/.env.https' \
		'make https-down       Stop the HTTPS deployment'

up:
	docker compose up --build -d

down:
	docker compose down

start: up

stop: down

restart:
	$(MAKE) down
	$(MAKE) up

logs:
	docker compose logs -f

install: install-frontend install-backend

install-frontend:
	cd client && npm ci

install-backend:
	cd server && $(POETRY) install

db-up:
	docker compose up -d postgres

db-down:
	docker compose stop postgres

db-migrate:
	cd server && $(POETRY) run alembic upgrade head

backup:
	BACKUP_DIR="$(BACKUP_DIR)" sh scripts/backup.sh

restore:
	@if [ -z "$(BACKUP)" ]; then \
		printf '%s\n' 'Set BACKUP to the backup directory, for example: make restore BACKUP=backups/20260101T000000Z' >&2; \
		exit 1; \
	fi
	BACKUP="$(BACKUP)" sh scripts/restore.sh

media-up:
	MEDIA_AUTH_URL=$${MEDIA_AUTH_URL:-http://host.docker.internal:3000/api/media/auth} docker compose up -d mediamtx

media-down:
	docker compose stop mediamtx

dev-frontend:
	cd client && npm run dev -- --host 0.0.0.0

dev-backend:
	cd server && $(POETRY) run alembic upgrade head && $(POETRY) run uvicorn app.main:app --reload --host 0.0.0.0 --port 3000 --no-access-log

lint:
	cd client && npm run lint
	cd server && $(POETRY) run ruff check src migrations tests

build:
	cd client && npm run build

backend-check:
	cd server && $(POETRY) run python -m compileall -q src/app
	cd server && $(POETRY) run python -c 'from app.main import app; print(app.title)'

backend-test:
	cd server && $(POETRY) run python -m unittest discover -s tests

docker-build:
	docker compose build

docker-up: up

docker-down: down

docker-logs: logs

https-up:
	$(HTTPS_COMPOSE) up --build -d

https-down:
	$(HTTPS_COMPOSE) down
