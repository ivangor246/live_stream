SHELL := /bin/sh

POETRY ?= poetry
HTTPS_COMPOSE = docker compose --env-file deploy/.env.https -f docker-compose.yml -f docker-compose.https.yml

.PHONY: help install install-frontend install-backend db-up db-down db-migrate media-up media-down backup \
        dev-frontend dev-backend lint build backend-check docker-build docker-up \
        docker-down docker-logs https-up https-down

help:
	@printf '%s\n' \
		'make install          Install frontend and backend dependencies' \
		'make dev-frontend     Start the Vite development server' \
		'make db-up            Start the local PostgreSQL service' \
		'make db-down          Stop the local PostgreSQL service' \
		'make db-migrate       Apply PostgreSQL migrations' \
		'make backup           Save PostgreSQL and recordings to BACKUP_DIR (default: backups)' \
		'make media-up         Start the local MediaMTX service' \
		'make media-down       Stop the local MediaMTX service' \
		'make dev-backend      Migrate and start the FastAPI server' \
		'make lint             Run frontend and backend lint checks' \
		'make build            Build the frontend' \
		'make backend-check    Compile-check the backend' \
		'make docker-build     Build both Docker images' \
		'make docker-up        Build and start frontend and backend' \
		'make docker-down      Stop Docker services' \
		'make docker-logs      Follow Docker service logs' \
		'make https-up         Start the HTTPS deployment from deploy/.env.https' \
		'make https-down       Stop the HTTPS deployment'

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
	cd server && $(POETRY) run ruff check src

build:
	cd client && npm run build

backend-check:
	cd server && $(POETRY) run python -m compileall -q src/app
	cd server && $(POETRY) run python -c 'from app.main import app; print(app.title)'

docker-build:
	docker compose build

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

https-up:
	$(HTTPS_COMPOSE) up --build -d

https-down:
	$(HTTPS_COMPOSE) down
