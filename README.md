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
- a MediaMTX service with RTMP publishing and HLS/WebRTC connection details;
- managed MediaMTX paths created at stream start and retained for archive playback;
- an embedded WebRTC player with automatic HLS fallback;
- first-run local administrator setup with cookie-based sessions;
- administrator, operator, and viewer roles with protected stream management;
- one-time account invitation links for operators and viewers;
- private stream events with revocable viewer access links;
- short-lived per-stream credentials for RTMP publishing and HLS/WebRTC viewing;
- automatic fMP4 recordings with a protected stream archive;
- CSV and JSON export of safe stream metadata for administrators and operators;
- on-demand backup of PostgreSQL metadata and MediaMTX recordings;
- structured JSON logs with request correlation IDs;
- Prometheus-compatible HTTP metrics and a public service status page;
- Russian and English localization;
- light and dark themes;
- reusable frontend UI components and configurable visual tokens;
- separate frontend, backend, PostgreSQL, and MediaMTX Docker services.

The dashboard prepares MediaMTX connection details and an embedded player for
each live stream. It also polls the MediaMTX Control API and displays the
current source status. Local accounts have role-based access to the dashboard.
MediaMTX asks the backend to validate every publish and read request for a live
path. The player prefers WebRTC and falls back to HLS. After a stream has
finished, its recorded segments are available through the protected archive.

## Technology

### Frontend

- React 19;
- TypeScript;
- Vite;
- React Router;
- browser WebSocket API;
- hls.js, loaded on demand for HLS fallback;
- CSS custom properties and local UI components.

### Backend

- Python 3.13;
- FastAPI;
- Uvicorn;
- Pydantic and pydantic-settings;
- SQLAlchemy async ORM;
- asyncpg;
- httpx;
- Alembic;
- PostgreSQL.

### Media

- MediaMTX for RTMP publishing and HLS/WebRTC delivery.

## Repository structure

```text
client/
  src/
    api/              typed HTTP client
    auth/             administrator session state and route guards
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
    api/              REST, authentication, and WebSocket transport
    core/              configuration and error handlers
    database/          SQLAlchemy base, models, and sessions
    repositories/     PostgreSQL data access, including auth sessions
    schemas/          Pydantic schemas for API and authentication
    services/         auth, stream, WebSocket, and media business services
  migrations/         Alembic migrations
  pyproject.toml      Poetry project with the app package
  poetry.lock         locked backend dependencies
  mediamtx.yml        MediaMTX protocol configuration

client/Dockerfile     frontend build and Nginx image
server/Dockerfile     Python 3.13 backend image
docker-compose.yml    frontend, backend, PostgreSQL, and MediaMTX services
docker-compose.https.yml
                      optional Caddy HTTPS reverse-proxy overlay
deploy/               Caddy configuration and HTTPS environment template
Makefile              common local and Docker commands
scripts/backup.sh     local backup helper for PostgreSQL and recordings
scripts/restore.sh    confirmed local backup restore helper
```

The old root-level `shared/` directory was removed. The frontend owns its
TypeScript contracts under `client/src/shared`; the Python backend validates
its own external data with Pydantic models.

## Quick start with Docker

Docker Compose is the recommended way to run the project:

```bash
make docker-up
```

The command builds the frontend and backend, starts PostgreSQL and MediaMTX,
applies pending Alembic migrations, and starts the application. Open
`http://localhost:8080` in a browser.

Default endpoints:

- frontend: `http://localhost:8080`;
- backend: `http://localhost:3000`;
- API documentation: `http://localhost:3000/docs`;
- PostgreSQL: `localhost:5432`;
- MediaMTX RTMP: `localhost:1935`;
- MediaMTX HLS: `http://localhost:8888`;
- MediaMTX WebRTC: `http://localhost:8889`;
- MediaMTX Control API: `http://127.0.0.1:9997` (loopback only).

Stop the containers without deleting PostgreSQL data:

```bash
make docker-down
```

The `postgres-data` Docker volume is kept by default. Set a strong
`POSTGRES_PASSWORD` before exposing the installation beyond a local network.
Recordings are stored separately in the `media-recordings` Docker volume and
are retained for 30 days by default.

## HTTPS deployment

For a public server, use the optional Caddy overlay. It keeps the normal
`docker-compose.yml` workflow for local development while providing one HTTPS
origin for the dashboard, API, WebSocket, HLS, and WebRTC signalling. Caddy
obtains and renews TLS certificates automatically for a public DNS name. See
the [Caddy automatic HTTPS documentation](https://caddyserver.com/docs/automatic-https)
for its certificate requirements.

Before starting the deployment:

1. Point the DNS `A`/`AAAA` record for the chosen domain to the server.
2. Allow inbound TCP ports `80`, `443`, and `1935`, plus UDP ports `443` and
   `8189` in the server firewall and provider firewall.
3. Copy the template and replace its example domain, email address, database
   password, and media auth secret:

   ```bash
   cp deploy/.env.https.example deploy/.env.https
   ```

4. Start the HTTPS stack:

   ```bash
   make https-up
   ```

Open `https://<LIVE_STREAM_DOMAIN>` after Caddy reports that the certificate
was obtained. Stop this variant with `make https-down`.

The template binds PostgreSQL, FastAPI, the frontend container, HLS, and the
WebRTC signalling server to `127.0.0.1`. Caddy is therefore the only public
HTTP entry point. RTMP publishing remains directly available on TCP `1935`, and
WebRTC media uses UDP `8189`; MediaMTX advertises the configured domain to
WebRTC clients. The Caddy proxy strips the `/hls` and `/webrtc` prefixes before
forwarding requests, as required when [MediaMTX is exposed in a
subfolder](https://mediamtx.org/docs/features/expose-the-server-in-a-subfolder).
Its WebSocket proxying is handled by Caddy's standard
[reverse-proxy support](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

Do not run `make docker-up` and `make https-up` on the same host at the same
time: both configurations use the same application services and media ports.
In this deployment, scrape metrics locally from
`http://127.0.0.1:3000/metrics` or through a trusted monitoring network rather
than adding a public metrics route.

## Backup

Create an on-demand backup while the PostgreSQL and MediaMTX services are
running:

```bash
make backup
```

The command writes a timestamped directory under `backups/` by default. Use a
separate local disk or mounted storage by overriding the destination:

```bash
BACKUP_DIR=/srv/live-stream-backups make backup
```

Each backup contains a `postgres.dump` file in PostgreSQL custom format, the
complete `recordings/` directory from MediaMTX, and `manifest.txt`. The backup
command only reads from running services; it does not stop streams or modify
Docker volumes. Finish active streams before creating a backup when every
recording segment must be internally consistent.

Keep backups outside the application host when possible. Restore one with the
following sequence:

```bash
make docker-down
RESTORE_DRY_RUN=true make restore BACKUP=backups/20260802T100000Z
make restore BACKUP=backups/20260802T100000Z
make docker-up
```

For an HTTPS deployment, use `make https-down` and `make https-up` for the
first and last commands instead. The restore command verifies the backup
layout, requires the exact `RESTORE` confirmation, drops and recreates the
configured PostgreSQL database, and replaces only the MediaMTX recordings
volume. It refuses to run while the application or MediaMTX is active. The
PostgreSQL container may remain running after the operation; the final start
command applies any pending Alembic migrations.

## Upgrade

Create a backup before every upgrade. For an installation cloned from this
repository, update the desired revision and rebuild the services:

```bash
make backup
git pull --ff-only
make docker-up
```

Use `make https-up` instead of `make docker-up` when the Caddy deployment is
configured. The backend container applies Alembic migrations before starting,
so do not run several application versions against the same database at once.
After the restart, open `/status` and confirm that backend, PostgreSQL, and
MediaMTX report `ok`.

If an upgrade fails, stop the deployment, return the repository to the last
known working revision, restore the pre-upgrade backup, and start that same
deployment variant again. A database backup cannot safely downgrade a schema
without restoring the matching application version.

On the first visit, the dashboard asks you to create a local administrator
account. Use a password with at least 12 characters. Later visits show the
sign-in form; the session is stored in an HttpOnly cookie and lasts 14 days by
default. Administrators can create one-time links for operator and viewer
accounts directly from the stream list. Send a link only through a trusted
channel: anyone who opens it before it expires can create the assigned account.

## Authentication

The first setup endpoint is available only while the PostgreSQL database has no
users. Health and database readiness endpoints remain public so Docker and
reverse proxies can check the service.

There are three local roles:

- **Administrator** — manages streams and account invitation links.
- **Operator** — manages streams and obtains RTMP publishing details.
  Operators can also export stream metadata.
- **Viewer** — lists streams and opens their safe playback details, but cannot
  obtain RTMP credentials or change stream state.

Administrators create one-time invitation links for operators and viewers from
the dashboard. The backend stores only a SHA-256 hash of each link token. Links
expire after seven days by default, can be revoked while unused, and are shown
in full only immediately after creation.

When creating a stream, an administrator or operator can mark it as private.
For a private stream, the stream page provides shareable viewer access links.
The recipient can open a link and watch the stream without a dashboard account.
Each link is a bearer credential, expires after seven days by default, and can
be revoked at any time. The backend stores only its SHA-256 hash; the full link
is shown only when it is created.

MediaMTX receives short-lived per-stream credentials from the backend. The
`MEDIA_AUTH_SECRET` value signs them and `MEDIA_AUTH_TOKEN_TTL_SECONDS` controls
their lifetime. Set a strong `MEDIA_AUTH_SECRET` in the root `.env` before
exposing the installation beyond a local network.

The archive is served by the backend, which checks the dashboard session or a
private viewer link before it proxies a recording from MediaMTX. Configure the
global retention period with `MEDIA_RECORD_RETENTION`; for example:

```dotenv
MEDIA_RECORD_RETENTION=30d
```

MediaMTX removes expired recording segments automatically. Set a duration that
matches the storage capacity and retention requirements of the installation.

For an HTTPS deployment, enable secure cookies in the root `.env` file:

```dotenv
AUTH_SECURE_COOKIE=true
AUTH_SESSION_TTL_DAYS=14
AUTH_INVITE_TTL_HOURS=168
STREAM_INVITE_TTL_HOURS=168
```

Keep `AUTH_SECURE_COOKIE=false` for plain HTTP local development. Adjust
`AUTH_INVITE_TTL_HOURS` or `STREAM_INVITE_TTL_HOURS` if your installation
needs a shorter or longer invitation lifetime.

## Logs and request IDs

The backend writes structured JSON logs to standard output. Each completed HTTP
request includes a timestamp, level, logger, request ID, method, route
template, status code, and duration. Raw URLs are not written to access logs,
so query credentials and private viewer-link tokens are not emitted there.

Send a UUID in the `X-Request-ID` request header to correlate a request with
other services. The backend returns the same header in its response. If the
header is absent or invalid, it creates a new UUID. Set `LOG_LEVEL` to control
the minimum emitted level; the default is `INFO`.

## Service status and metrics

Open `http://localhost:8080/status` to see the current backend, PostgreSQL,
and MediaMTX availability. The page is public so an operator can diagnose an
installation before signing in; it exposes only an aggregate service state.

`GET /api/status` returns the same safe service state as JSON. `GET /metrics`
returns Prometheus-compatible HTTP request totals and duration summaries. Its
labels use HTTP method, route template, and status code, never the raw URL.
Metrics are stored in the backend process and reset on restart. Put `/metrics`
behind a trusted monitoring network or reverse-proxy rule before exposing the
installation publicly.

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
MEDIA_AUTH_URL=http://host.docker.internal:3000/api/media/auth make media-up
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

To stop the local media server:

```bash
make media-down
```

For a custom PostgreSQL connection, set `DATABASE_URL` in `server/.env`. For
the local MediaMTX status endpoint, set `MEDIA_API_URL` to the Control API
address. For Docker Compose, set the corresponding variables in a root `.env`
file and use the Docker service hostname when a dependency runs inside Compose.
The `MEDIA_AUTH_URL` override in the `make media-up` example connects the
containerized MediaMTX service to a backend running directly on the host.

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
| `make backup` | Create a local PostgreSQL and recordings backup |
| `make restore BACKUP=…` | Confirm and restore one local PostgreSQL and recordings backup |
| `make media-up` | Start the local MediaMTX service |
| `make media-down` | Stop the local MediaMTX service |
| `make lint` | Run frontend ESLint and backend Ruff checks |
| `make build` | Build the frontend for production |
| `make backend-check` | Compile-check and import-check the backend |
| `make docker-build` | Build all Docker images |
| `make docker-up` | Build and start all Docker services |
| `make docker-down` | Stop and remove the Docker containers |
| `make docker-logs` | Follow Docker service logs |
| `make https-up` | Build and start the Caddy HTTPS deployment from `deploy/.env.https` |
| `make https-down` | Stop the Caddy HTTPS deployment |

## REST API

| Method | URL | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the backend process is running |
| `GET` | `/api/ready` | Check that the backend can access PostgreSQL |
| `GET` | `/api/status` | Get backend, PostgreSQL, and MediaMTX availability |
| `GET` | `/metrics` | Get Prometheus-compatible HTTP metrics |
| `GET` | `/api/auth/status` | Check setup and session status |
| `POST` | `/api/auth/setup` | Create the first administrator account |
| `POST` | `/api/auth/login` | Start an authenticated session |
| `POST` | `/api/auth/logout` | End the current session |
| `GET` | `/api/auth/invitations` | List active account invitations (administrator only) |
| `POST` | `/api/auth/invitations` | Create an operator/viewer invitation (administrator only) |
| `DELETE` | `/api/auth/invitations/{invitationId}` | Revoke an unused invitation (administrator only) |
| `GET` | `/api/auth/invitations/{token}` | Check an invitation before accepting it |
| `POST` | `/api/auth/invitations/{token}/accept` | Create an account from an invitation |
| `GET` | `/api/viewer-invitations/{token}` | Get private-stream playback from a viewer link |
| `GET` | `/api/viewer-invitations/{token}/recordings` | List recordings available through a private viewer link |
| `GET` | `/api/viewer-invitations/{token}/recordings/playback` | Play one recording through a private viewer link |
| `GET` | `/api/streams` | Get all streams (any authenticated role) |
| `GET` | `/api/streams/export?format=csv\|json` | Download safe stream metadata (administrator or operator) |
| `GET` | `/api/streams/{streamId}` | Get one stream (any authenticated role) |
| `GET` | `/api/streams/{streamId}/playback` | Get safe HLS/WebRTC playback details (any authenticated role) |
| `GET` | `/api/streams/{streamId}/recordings` | List protected recording segments (any authenticated role) |
| `GET` | `/api/streams/{streamId}/recordings/playback` | Play one protected recording segment (any authenticated role) |
| `GET` | `/api/streams/{streamId}/connection` | Get RTMP connection details (administrator or operator) |
| `GET` | `/api/streams/{streamId}/viewer-invitations` | List active viewer links (administrator or operator) |
| `POST` | `/api/streams/{streamId}/viewer-invitations` | Create a viewer link for a private stream (administrator or operator) |
| `DELETE` | `/api/streams/{streamId}/viewer-invitations/{invitationId}` | Revoke a viewer link (administrator or operator) |
| `POST` | `/api/streams` | Create a stream (administrator or operator) |
| `POST` | `/api/streams/{streamId}/start` | Start a scheduled stream (administrator or operator) |
| `POST` | `/api/streams/{streamId}/finish` | Finish a live stream (administrator or operator) |

The connection response includes `sourceStatus` (`online`, `offline`, or
`unavailable`) and the detected `sourceProtocol` when MediaMTX has an active
publisher.

Create a stream with:

```json
{
  "title": "Product launch",
  "isPrivate": true
}
```

The API returns stream fields in the frontend contract format:

```json
{
  "id": "...",
  "title": "Product launch",
  "isPrivate": true,
  "status": "scheduled",
  "viewerCount": 0,
  "reactionCount": 0,
  "createdAt": "2026-08-01T09:00:00Z",
  "startedAt": null,
  "finishedAt": null
}
```

## Export stream metadata

Administrators and operators can download the complete stream list from the
dashboard as CSV or JSON. The export contains stream identifiers, titles,
privacy and lifecycle status, counters, and timestamps. It never includes
stream keys, viewer-link tokens, sessions, or media credentials.

CSV is the default API format and includes a UTF-8 BOM for spreadsheet
applications. Use `?format=json` when the data is intended for another tool or
an automated local workflow.

## Media workflow

1. Create a stream in the dashboard.
2. Copy the complete RTMP publish URL from the stream page into OBS as a
   custom RTMP server. It contains a short-lived publish credential.
3. Start the stream in the dashboard. The backend creates its MediaMTX path.
4. Publish the stream. MediaMTX validates the publish credential and makes the
   HLS and WebRTC links available in the same panel.
5. When the stream is live, the panel refreshes the source status every five
   seconds and shows the detected source protocol.
6. Finish the stream in the dashboard. MediaMTX stops recording and the stream
   page exposes its archive. Private viewer links can open the same archive.

The HLS and WebRTC links contain short-lived viewer credentials for copying or
sharing. The embedded player removes them before making browser requests and
sends the credentials in the `Authorization` header.

The MediaMTX credential flow follows the [MediaMTX authentication guide](https://mediamtx.org/docs/features/authentication). Recording and archive playback
follow the [MediaMTX recording guide](https://mediamtx.org/docs/features/record)
and [playback guide](https://mediamtx.org/docs/features/playback).

For protocol-specific setup, see the [MediaMTX OBS guide](https://mediamtx.org/docs/publish/obs-studio),
[HLS guide](https://mediamtx.org/docs/read/hls), and
[WebRTC guide](https://mediamtx.org/docs/read/webrtc).

## WebSocket API

Connect to the dashboard WebSocket with the administrator session:

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

- no source-state history, alerts, or automatic stream lifecycle changes;
- account invitation links are not delivered by email or another notification service;
- viewer links are bearer credentials and cannot yet be assigned to named attendees;
- recording retention is global; there is no per-stream deletion or retention policy yet;
- active WebSocket viewer state is local to one backend process;
- active viewer counts are reset when the backend starts;
- backups are created on demand; scheduling, remote storage, and integrity verification are not available yet;
- logs are not yet sent to an external aggregation service;
- metrics are local to one backend process and reset after restart;
- no automatic WebSocket reconnection;
- no multi-instance backend coordination.
