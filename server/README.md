# Live Stream Monitor Backend

The `server` directory contains the FastAPI service for Live Stream Monitor.
It owns stream lifecycle rules, authentication and authorization, PostgreSQL
persistence, MediaMTX integration, recording access, exports, and the
dashboard WebSocket.

## Responsibilities

- expose the REST API and dashboard WebSocket;
- validate external input with Pydantic schemas;
- persist streams, users, sessions, invitations, and stream keys in
  PostgreSQL;
- apply schema changes with Alembic migrations;
- enforce administrator, operator, and viewer permissions on the backend;
- create and retain managed MediaMTX paths for live streams;
- authorize RTMP publish, HLS/WebRTC playback, and recording playback;
- proxy protected recordings instead of exposing the recordings volume;
- export only safe stream metadata;
- write structured JSON request logs and process-local Prometheus metrics.

The backend is independently runnable and does not require Node.js. It does
not import code from `client` or from a root-level `shared` directory.

## Technology

- Python 3.13;
- FastAPI and Uvicorn;
- Pydantic and `pydantic-settings`;
- SQLAlchemy async ORM and `asyncpg`;
- PostgreSQL;
- Alembic;
- Poetry for dependency management;
- Ruff for linting.

## Source layout

```text
src/app/
  api/             REST, authentication, MediaMTX auth, and WebSocket transport
  core/            settings, errors, JSON logging, and metrics
  database/        SQLAlchemy base, models, and sessions
  repositories/    PostgreSQL data access
  schemas/         Pydantic API, auth, media, export, and WebSocket schemas
  services/        auth, streams, media, exports, invitations, and WebSocket logic
  utils/           shared backend utilities
migrations/        Alembic environment and migration versions
tests/             backend regression tests
mediamtx.yml       local MediaMTX protocol configuration
```

Business rules live in services; HTTP and WebSocket modules only translate
transport data and connect dependencies.

## Configuration

For a backend running directly on the host, copy the example file and edit
the values for the local installation:

```bash
cp server/.env.example server/.env
```

When the project runs with Docker Compose, use the root `.env` file instead;
Compose passes its values into the backend container.

Important settings:

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | Async PostgreSQL connection string |
| `CORS_ORIGINS` | Comma-separated browser origins allowed by the API |
| `MEDIA_RTMP_URL` | RTMP publishing address shown to operators |
| `MEDIA_HLS_URL` | HLS playback base address |
| `MEDIA_WEBRTC_URL` | WebRTC playback base address |
| `MEDIA_API_URL` | Internal MediaMTX Control API address |
| `MEDIA_PLAYBACK_API_URL` | Internal MediaMTX Playback API address for recordings |
| `MEDIA_AUTH_SECRET` | Secret used to sign short-lived media credentials |
| `MEDIA_AUTH_TOKEN_TTL_SECONDS` | Lifetime of a media credential |
| `AUTH_SECURE_COOKIE` | Set to `true` when the dashboard uses HTTPS |
| `AUTH_SESSION_TTL_DAYS` | Dashboard session lifetime |
| `AUTH_INVITE_TTL_HOURS` | Account invitation lifetime |
| `STREAM_INVITE_TTL_HOURS` | Private viewer-link lifetime |
| `LOG_LEVEL` | Minimum JSON log level |

Keep the MediaMTX Control API and Playback API on internal or loopback
addresses. Set strong, unique values for `POSTGRES_PASSWORD` and
`MEDIA_AUTH_SECRET` before exposing a deployment publicly.

## Local development

Requirements: Python 3.13, Poetry 2.1 or newer, Docker with Compose support,
PostgreSQL, and MediaMTX. From the repository root:

```bash
cp server/.env.example server/.env
make install-backend
make db-up
MEDIA_AUTH_URL=http://host.docker.internal:3000/api/media/auth make media-up
make dev-backend
```

`make dev-backend` applies all pending migrations and starts Uvicorn with
reload at <http://localhost:3000>. Run `make dev-frontend` in another terminal
for the Vite dashboard. The frontend proxies `/api` and `/ws` to this server.
Alternatively, run `make dev` from the repository root to start PostgreSQL,
MediaMTX, FastAPI, and Vite together with hot reload. Press `Ctrl-C` to stop
the host processes and local development containers; use `make dev-down` if
the command was interrupted.

The equivalent direct commands are:

```bash
cd server
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 3000 --no-access-log
```

The backend container runs the migration command from
`docker-entrypoint.sh` before starting Uvicorn. The complete containerized
stack can be started from the repository root with `make up`.

## Authentication and authorization

The setup endpoint is available only while PostgreSQL contains no users.
Sessions use an HttpOnly cookie. Passwords, session tokens, account invitation
tokens, and private viewer-link tokens are stored only as hashes. Source
tokens are returned only in the response that creates them and are not logged.

| Role | Access |
| --- | --- |
| Administrator | Manage streams, invitations, accounts, roles, and exports |
| Operator | Manage streams, obtain RTMP connection details, create viewer links, and export metadata |
| Viewer | List streams and receive safe playback details; cannot obtain RTMP credentials or change stream state |

Administrators cannot disable or lower their own account. Disabling an account
revokes its sessions. Deletion is allowed only for another already-disabled
account and does not delete streams or recordings. Changing your own password
requires the current password, revokes all previous sessions, and creates a
new session for the current browser.

Private viewer links work only for private streams. They are revocable bearer
credentials with a configurable lifetime and grant access only to the linked
stream and its protected archive.

## REST API

Interactive OpenAPI documentation is available at
<http://localhost:3000/docs> while the backend is running.

### Health and authentication

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Check that the backend process is running |
| `GET` | `/api/ready` | Public | Check backend access to PostgreSQL |
| `GET` | `/api/status` | Public | Get aggregate backend, PostgreSQL, and MediaMTX status |
| `GET` | `/metrics` | Public | Return Prometheus-compatible HTTP metrics |
| `GET` | `/api/auth/status` | Public | Check setup and current session state |
| `POST` | `/api/auth/setup` | Public during first setup | Create the first administrator |
| `POST` | `/api/auth/login` | Public | Start a session |
| `POST` | `/api/auth/logout` | Session | End the current session |
| `POST` | `/api/auth/password` | Session | Change the password and revoke previous sessions |
| `GET` | `/api/auth/users` | Administrator | List dashboard accounts |
| `PATCH` | `/api/auth/users/{userId}` | Administrator | Enable, disable, or change an account role |
| `DELETE` | `/api/auth/users/{userId}` | Administrator | Delete a disabled account |
| `GET` | `/api/auth/invitations` | Administrator | List active account invitations |
| `POST` | `/api/auth/invitations` | Administrator | Create an operator or viewer invitation |
| `DELETE` | `/api/auth/invitations/{invitationId}` | Administrator | Revoke an unused account invitation |
| `GET` | `/api/auth/invitations/{token}` | Public | Check an account invitation |
| `POST` | `/api/auth/invitations/{token}/accept` | Public | Create an account from an invitation |

### Streams and playback

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/streams` | Any session | List streams |
| `GET` | `/api/streams/{streamId}` | Any session | Get one stream |
| `GET` | `/api/streams/export?format=csv\|json` | Administrator or operator | Download safe stream metadata |
| `GET` | `/api/streams/{streamId}/playback` | Any session | Get safe HLS/WebRTC details |
| `GET` | `/api/streams/{streamId}/recordings` | Any session | List protected recording segments |
| `GET` | `/api/streams/{streamId}/recordings/playback` | Any session | Stream one protected recording segment |
| `GET` | `/api/streams/{streamId}/connection` | Administrator or operator | Get RTMP connection details |
| `POST` | `/api/streams` | Administrator or operator | Create a stream |
| `POST` | `/api/streams/{streamId}/start` | Administrator or operator | Create the MediaMTX path and start a stream |
| `POST` | `/api/streams/{streamId}/finish` | Administrator or operator | Finish a live stream |
| `GET` | `/api/streams/{streamId}/viewer-invitations` | Administrator or operator | List private viewer links |
| `POST` | `/api/streams/{streamId}/viewer-invitations` | Administrator or operator | Create a private viewer link |
| `DELETE` | `/api/streams/{streamId}/viewer-invitations/{invitationId}` | Administrator or operator | Revoke a private viewer link |
| `GET` | `/api/viewer-invitations/{token}` | Private viewer link | Get linked stream playback details |
| `GET` | `/api/viewer-invitations/{token}/recordings` | Private viewer link | List linked stream recordings |
| `GET` | `/api/viewer-invitations/{token}/recordings/playback` | Private viewer link | Play a linked recording segment |

An example stream creation request is:

```json
{
  "title": "Product launch",
  "isPrivate": true,
  "scheduledAt": "2026-08-10T17:00:00Z"
}
```

The planned start is an informational UTC timestamp. It does not trigger a
background start or a MediaMTX action.

Exports contain identifiers, titles, privacy and lifecycle status, counters,
and UTC timestamps. They never contain stream keys, media credentials,
viewer-link tokens, invitations, or sessions.

## WebSocket API

Connect with the authenticated dashboard session:

```text
ws://localhost:3000/ws
```

The dashboard joins a stream with:

```json
{
  "type": "viewer:join",
  "payload": {
    "streamId": "...",
    "viewerId": "..."
  }
}
```

It sends reactions with:

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

Server message types are `stream:viewers-updated`,
`stream:reaction-received`, `stream:status-updated`, and `error`. Only
viewers connected to a live stream can send reactions. A policy close uses
code `1008`; the frontend does not retry it. Active connections and counters
are process-local and reset when the backend restarts.

## MediaMTX and recordings

The live-stream flow is:

1. Create a stream and optionally set its planned UTC start time.
2. Start the stream from the dashboard; the backend creates its managed
   MediaMTX path.
3. Copy the short-lived RTMP publish URL and stream key into OBS or another
   publisher.
4. MediaMTX sends publish/read/authentication requests to
   `/api/media/auth`; the backend checks the stream state and signed media
   credential.
5. The dashboard polls source status every five seconds and prefers WebRTC
   playback, with HLS available as fallback.
6. Finish the stream. MediaMTX retains the path for archive playback and
   records fMP4 segments in the recordings volume.

MediaMTX removes expired segments according to the global
`MEDIA_RECORD_RETENTION` duration. Archive access goes through the backend,
which checks the dashboard session or the matching private viewer link before
proxying a recording. Anonymous direct archive access is not enabled.

## Logs, request IDs, and metrics

Completed HTTP requests are written as JSON to stdout. Logs include the
request UUID, HTTP method, route template, status code, duration, timestamp,
and level. Raw URLs, query parameters, cookies, credentials, tokens, and
exception text are not logged.

Clients may send a UUID in `X-Request-ID`; the backend returns that same UUID.
If the header is absent or invalid, the backend creates a new one.

`GET /metrics` exposes process-local Prometheus-compatible HTTP counters and
duration summaries. Labels contain only the method, route template, and status
code. Metrics reset after a process restart and should be kept behind a
trusted monitoring network in public deployments.

## Checks and tests

From the repository root:

```bash
make lint
make backend-check
make backend-test
```

The equivalent backend-only commands are:

```bash
cd server
poetry run ruff check src migrations tests
poetry run python -m compileall -q src/app
poetry run python -c 'from app.main import app; print(app.title)'
poetry run python -m unittest discover -s tests
```

The Docker image runs migrations before starting the API. Build it separately
with:

```bash
docker build -t live-stream-backend ./server
```

Repository CI runs dependency installation, Ruff, compilation, import, and
unit-test checks for this component, plus a Docker Compose smoke test for the
complete application.
