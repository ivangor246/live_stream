SHELL := /bin/sh

POETRY ?= poetry

.PHONY: help install install-frontend install-backend db-up db-down db-migrate \
        dev-frontend dev-backend lint build backend-check docker-build docker-up \
        docker-down docker-logs

help:
	@printf '%s\n' \
		'make install          Install frontend and backend dependencies' \
		'make dev-frontend     Start the Vite development server' \
		'make db-up            Start the local PostgreSQL service' \
		'make db-down          Stop the local PostgreSQL service' \
		'make db-migrate       Apply PostgreSQL migrations' \
		'make dev-backend      Migrate and start the FastAPI server' \
		'make lint             Run frontend and backend lint checks' \
		'make build            Build the frontend' \
		'make backend-check    Compile-check the backend' \
		'make docker-build     Build both Docker images' \
		'make docker-up        Build and start frontend and backend' \
		'make docker-down      Stop Docker services' \
		'make docker-logs      Follow Docker service logs'

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

dev-frontend:
	cd client && npm run dev -- --host 0.0.0.0

dev-backend:
	cd server && $(POETRY) run alembic upgrade head && $(POETRY) run uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

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
