# Live Stream Monitor

Live Stream Monitor is a self-hosted control panel for managing live-stream
events. It is designed for personal servers, small teams, and private
communities that need a simple dashboard without depending on a hosted video
platform.

The current release provides:

- creation, starting, and finishing of stream events;
- persistent stream metadata in PostgreSQL;
- automatic database migrations in Docker;
- REST and WebSocket APIs;
- viewer counts and live reactions;
- health and database readiness endpoints;
- a backend and database status indicator in the dashboard;
- stream status filters and sorting;
- a first-run empty state and confirmation for finishing streams;
- Russian and English localization;
- light and dark themes;
- reusable frontend UI components and configurable visual tokens;
- separate frontend, backend, and PostgreSQL Docker services.

Video ingestion and playback are not implemented yet. The stream page currently
contains a player placeholder. Media transport is planned as a separate
integration with a dedicated media server.

## Technology

### Frontend

- React 19;
- TypeScript;
- Vite;
- React Router;
- browser WebSocket API;
- CSS custom properties and local UI components.

### Backend

- Python 3.13;
- FastAPI;
- Uvicorn;
- Pydantic and pydantic-settings;
- SQLAlchemy async ORM;
- asyncpg;
- Alembic;
- PostgreSQL.

## Repository structure

```text
client/
  src/
    api/              typed HTTP client
    components/       reusable feature and layout components
      layout/         application header and preference controls
      ui/              local visual component library
    hooks/            client hooks, including WebSocket state
    i18n/             locale resources and error translation
    pages/            route-level screens
    shared/           frontend-owned TypeScript contracts
    theme/            light/dark theme state

server/
  src/app/
    api/              REST and WebSocket transport
    core/              configuration and error handlers
    database/          SQLAlchemy base, models, and sessions
    repositories/     PostgreSQL data access
    schemas/          Pydantic schemas
    services/         stream and WebSocket business services
  migrations/         Alembic migrations
  pyproject.toml      Poetry project with the app package
  poetry.lock         locked backend dependencies

client/Dockerfile     frontend build and Nginx image
server/Dockerfile     Python 3.13 backend image
docker-compose.yml    frontend, backend, and PostgreSQL services
Makefile              common local and Docker commands
```

The old root-level `shared/` directory was removed. The frontend owns its
TypeScript contracts under `client/src/shared`; the Python backend validates
its own external data with Pydantic models.

## Quick start with Docker

Docker Compose is the recommended way to run the project:

```bash
make docker-up
```

The command builds the frontend and backend, starts PostgreSQL, applies pending
Alembic migrations, and starts the application. Open
`http://localhost:8080` in a browser.

Default endpoints:

- frontend: `http://localhost:8080`;
- backend: `http://localhost:3000`;
- API documentation: `http://localhost:3000/docs`;
- PostgreSQL: `localhost:5432`.

Stop the containers without deleting PostgreSQL data:

```bash
make docker-down
```

The `postgres-data` Docker volume is kept by default. Set a strong
`POSTGRES_PASSWORD` before exposing the installation beyond a local network.

## Local development

Requirements:

- Python 3.13;
- Node.js 22 or newer;
- npm;
- Poetry 2.1 or newer;
- Docker with Compose support for the local PostgreSQL service;
- GNU Make is recommended.

Install dependencies and prepare the local environment:

```bash
cp server/.env.example server/.env
make install
make db-up
```

Start the backend and frontend in separate terminals:

```bash
make dev-backend
```

The backend command applies migrations before starting FastAPI. It is
available at `http://localhost:3000`.

```bash
make dev-frontend
```

The frontend is available at `http://localhost:5173`. Vite proxies `/api` and
`/ws` to the backend.

To stop only the local database:

```bash
make db-down
```

For a custom PostgreSQL connection, set `DATABASE_URL` in `server/.env`. For
Docker Compose, set the corresponding variables in a root `.env` file and use
the Docker service hostname when the database runs inside Compose.

## Makefile commands

Run `make help` for the full list:

| Command | Purpose |
| --- | --- |
| `make install` | Install frontend npm packages and backend Poetry dependencies |
| `make dev-frontend` | Start the Vite development server |
| `make dev-backend` | Apply migrations and start the FastAPI server |
| `make db-up` | Start the local PostgreSQL container |
| `make db-down` | Stop the local PostgreSQL container |
| `make db-migrate` | Apply PostgreSQL migrations manually |
| `make lint` | Run frontend ESLint and backend Ruff checks |
| `make build` | Build the frontend for production |
| `make backend-check` | Compile-check and import-check the backend |
| `make docker-build` | Build all Docker images |
| `make docker-up` | Build and start all Docker services |
| `make docker-down` | Stop and remove the Docker containers |
| `make docker-logs` | Follow Docker service logs |

## REST API

| Method | URL | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the backend process is running |
| `GET` | `/api/ready` | Check that the backend can access PostgreSQL |
| `GET` | `/api/streams` | Get all streams |
| `GET` | `/api/streams/{streamId}` | Get one stream |
| `POST` | `/api/streams` | Create a stream |
| `POST` | `/api/streams/{streamId}/start` | Start a scheduled stream |
| `POST` | `/api/streams/{streamId}/finish` | Finish a live stream |

Create a stream with:

```json
{
  "title": "Product launch"
}
```

The API returns stream fields in the frontend contract format:

```json
{
  "id": "...",
  "title": "Product launch",
  "status": "scheduled",
  "viewerCount": 0,
  "reactionCount": 0,
  "createdAt": "2026-08-01T09:00:00Z",
  "startedAt": null,
  "finishedAt": null
}
```

## WebSocket API

Connect to:

```text
ws://localhost:3000/ws
```

The frontend sends a viewer join message:

```json
{
  "type": "viewer:join",
  "payload": {
    "streamId": "...",
    "viewerId": "..."
  }
}
```

Reactions use the same connection:

```json
{
  "type": "reaction:send",
  "payload": {
    "streamId": "...",
    "viewerId": "...",
    "reaction": "like"
  }
}
```

Server messages are:

- `stream:viewers-updated`;
- `stream:reaction-received`;
- `stream:status-updated`;
- `error`.

Only viewers connected to a live stream can send reactions. A finished stream
rejects new viewers and reactions.

## Frontend preferences and visual system

The frontend detects the first supported browser language from
`navigator.languages` and `navigator.language`. Russian is selected for
`ru-*`, English for `en-*`, and English is used for all other languages. A
manual language selection is stored in `localStorage`.

The theme switcher stores the explicit light/dark choice in `localStorage`. If
no choice exists, the initial theme follows `prefers-color-scheme`.

Reusable components such as `Button`, `ButtonLink`, `Card`, and `StatusBadge`
live under `client/src/components/ui`. Pages use CSS custom properties from
`client/src/index.css` for surfaces, colors, borders, shadows, and radii, so a
visual style can be changed centrally. Component variants are preferred over
page-specific styling.

## Current limitations

- no authentication or role separation;
- no video ingestion or playback;
- no MediaMTX integration yet;
- active WebSocket viewer state is local to one backend process;
- active viewer counts are reset when the backend starts;
- no automated PostgreSQL backup or retention policy;
- no automatic WebSocket reconnection;
- no multi-instance backend coordination.
