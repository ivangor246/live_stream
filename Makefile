SHELL := /bin/sh

PYTHON ?= python3
VENV ?= server/.venv
VENV_PYTHON := $(VENV)/bin/python
VENV_PIP := $(VENV)/bin/pip

.PHONY: help install install-frontend install-backend dev-frontend dev-backend \
        lint build backend-check docker-build docker-up docker-down docker-logs

help:
	@printf '%s\n' \
		'make install          Install frontend and backend dependencies' \
		'make dev-frontend     Start the Vite development server' \
		'make dev-backend      Start the FastAPI development server' \
		'make lint             Run frontend lint checks' \
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
	$(PYTHON) -m venv $(VENV)
	$(VENV_PIP) install -r server/requirements.txt

dev-frontend:
	cd client && npm run dev -- --host 0.0.0.0

dev-backend:
	PYTHONPATH=server $(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

lint:
	cd client && npm run lint

build:
	cd client && npm run build

backend-check:
	$(PYTHON) -m compileall -q server/app
	PYTHONPATH=server $(PYTHON) -c 'from app.main import app; print(app.title)'

docker-build:
	docker compose build

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f
