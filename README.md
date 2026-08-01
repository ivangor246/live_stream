# Live Stream Monitor

Live Stream Monitor is an exploratory full-stack application for creating and monitoring live streams. The final product direction is intentionally open, so the code focuses on a small, extensible real-time dashboard rather than committing to authentication, persistent storage, or video delivery.

The current application supports:

- creating scheduled streams;
- starting and finishing streams;
- listing and opening streams through a REST API;
- tracking connected viewers through WebSocket;
- broadcasting viewer counts, reactions, and status changes;
- `like`, `fire`, and `clap` reactions;
- validation and structured API/WebSocket errors;
- Russian and English frontend localization;
- browser-language detection with English fallback;
- light and dark themes;
- reusable frontend UI components with configurable visual tokens;
- separate frontend and backend Docker services.

Video transport is not implemented yet. The stream page currently displays a player placeholder. Stream data is stored in memory and is lost when the backend restarts.

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
- Pydantic;
- in-memory repository.

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
  app/
    api.py            REST routes
    errors.py         application errors
    main.py           FastAPI application assembly
    models.py         domain and request models
    repository.py     in-memory storage
    schemas.py        API and WebSocket schemas
    service.py        stream business rules
    websocket.py      WebSocket connection manager

client/Dockerfile     frontend build and Nginx image
server/Dockerfile     Python 3.13 backend image
docker-compose.yml    separate frontend and backend services
Makefile              common local and Docker commands
```

The old root-level `shared/` directory was removed. The frontend owns its TypeScript contracts under `client/src/shared`; the Python backend validates its own external data with Pydantic models.

## Requirements

For local development:

- Python 3.13 or newer in the Python 3.x line;
- Node.js 22 or newer;
- npm;
- GNU Make is recommended.

For containerized development:

- Docker with Docker Compose support.

## Local development

Install both sets of dependencies:

```bash
make install
```

Start the backend and frontend in separate terminals:

```bash
make dev-backend
```

The FastAPI server is available at `http://localhost:3000`. Interactive API documentation is available at `http://localhost:3000/docs`.

```bash
make dev-frontend
```

The Vite frontend is available at `http://localhost:5173`. Its development proxy forwards `/api` and `/ws` to the backend.

The services can also be started directly:

```bash
cd server
./.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

```bash
cd client
npm run dev -- --host 0.0.0.0
```

## Makefile commands

Run `make help` for the full list. The main commands are:

| Command | Purpose |
| --- | --- |
| `make install` | Install frontend npm packages and backend packages into `server/.venv` |
| `make dev-frontend` | Start the Vite development server |
| `make dev-backend` | Start the FastAPI development server |
| `make lint` | Run the frontend ESLint checks |
| `make build` | Build the frontend for production |
| `make backend-check` | Compile-check and import-check the backend |
| `make docker-build` | Build both Docker images |
| `make docker-up` | Build and start both Docker services |
| `make docker-down` | Stop and remove the Docker services |
| `make docker-logs` | Follow Docker service logs |

## Docker

Build and start the separate services with:

```bash
make docker-up
```

The default addresses are:

- frontend: `http://localhost:8080`;
- backend: `http://localhost:3000`;
- backend API documentation: `http://localhost:3000/docs`.

The frontend image contains the Vite production build and Nginx. Nginx serves the single-page application, proxies `/api` to the backend service, and forwards WebSocket upgrades from `/ws`. The backend image uses Python 3.13 and Uvicorn.

Stop the services with:

```bash
make docker-down
```

The following environment variables can change the published ports or CORS origin:

```bash
FRONTEND_PORT=8081 BACKEND_PORT=3001 CORS_ORIGINS=http://localhost:8081 make docker-up
```

## REST API

| Method | URL | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check backend availability |
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

Only viewers connected to a live stream can send reactions. A finished stream rejects new viewers and reactions.

## Frontend preferences and visual system

The frontend detects the first supported browser language from `navigator.languages` and `navigator.language`. Russian is selected for `ru-*`, English for `en-*`, and English is used for all other languages. A manual language selection is stored in `localStorage`.

The theme switcher stores the explicit light/dark choice in `localStorage`. If no choice exists, the initial theme follows `prefers-color-scheme`.

Reusable components such as `Button`, `ButtonLink`, `Card`, and `StatusBadge` live under `client/src/components/ui`. Pages use CSS custom properties from `client/src/index.css` for surfaces, colors, borders, shadows, and radii, so a visual style can be changed centrally. Component variants are preferred over page-specific styling.

## Limitations

- no authentication or role separation;
- no persistent database;
- no video ingestion or playback;
- no automatic WebSocket reconnection;
- WebSocket state is local to one backend process;
- the in-memory repository is not suitable for multiple backend replicas.
