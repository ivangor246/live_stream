# Live Stream Monitor

[![Continuous integration](https://github.com/ivangor246/live_stream/actions/workflows/ci.yml/badge.svg)](https://github.com/ivangor246/live_stream/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

Live Stream Monitor is a self-hosted dashboard for managing live-stream
events on a personal server or a private network. It combines a React
dashboard, a FastAPI backend, PostgreSQL, and MediaMTX into one local
deployment.

## Features

- create scheduled stream events with an optional planned start time;
- start and finish streams manually from the dashboard;
- publish through RTMP and watch through WebRTC with automatic HLS fallback;
- show MediaMTX source status, detected source protocol, and viewer counts;
- send live viewer-count, reaction, and stream-status updates over WebSocket;
- let guests open the dashboard and create, start, finish, and publish their
  own streams without a sign-in;
- ask each viewer for a display name before connecting to a live stream;
- keep stream metadata in PostgreSQL and apply Alembic migrations on startup;
- use administrator, operator, and viewer roles with HttpOnly cookie sessions;
- create one-time account invitations and reversible account deactivation;
- create private streams with revocable viewer links that do not require a
  dashboard account;
- issue short-lived credentials for RTMP publishing and HLS/WebRTC playback;
- record streams as fMP4 segments and serve a protected archive;
- export safe stream metadata as CSV or JSON for administrators and operators;
- create local PostgreSQL and recording backups on demand;
- expose health, readiness, aggregate service status, JSON request logs, and
  Prometheus-compatible HTTP metrics;
- provide Russian and English localization, light and dark themes, and
  reusable frontend components.

The planned start time is informational and stored in UTC. It never starts a
stream or a media path automatically. A stream is started explicitly by its
guest creator, an administrator, or an operator, then MediaMTX accepts the
authorized publisher.
After the stream is finished, its recording remains available through the
protected archive until the configured retention period expires.

## Architecture

| Component | Responsibility |
| --- | --- |
| `client/` | React and TypeScript dashboard, player, localization, and theme state |
| `server/` | FastAPI REST/WebSocket API, authentication, stream lifecycle, exports, and media authorization |
| PostgreSQL | Stream metadata, users, invitations, sessions, and stream keys |
| MediaMTX | RTMP publishing, HLS/WebRTC delivery, path management, and fMP4 recordings |
| Caddy (optional) | HTTPS reverse proxy for a public deployment |

The backend does not import code from the frontend. Frontend contracts are
owned by `client/src/shared`, while backend request and response data is
validated by Pydantic models. Active WebSocket connections and current viewer
counters belong to one backend process and reset after a restart.

Read the component-specific documentation for implementation details:

- [Frontend README](client/README.md) — dashboard structure, player behavior,
  localization, theme, and frontend commands;
- [Backend README](server/README.md) — API, authentication, MediaMTX
  integration, configuration, and backend commands.

## Quick start with Docker

Requirements: Docker with Compose support and GNU Make.

Build and start the complete local stack with one command:

```bash
make up
```

This starts the frontend, backend, PostgreSQL, and MediaMTX containers in the
background. The backend applies pending migrations before serving requests.
Open the dashboard at <http://localhost:8080>; it is ready to use immediately.
Creating an administrator account is optional and available through **Sign in**.

Useful commands:

```bash
make logs       # follow all service logs
make down       # stop and remove the containers, keep named volumes
make restart    # recreate the complete local stack
```

## Development mode

For hot reload without building frontend and backend images, install the
dependencies and start the host-based development stack:

```bash
cp server/.env.example server/.env
make install
make dev
```

This command starts PostgreSQL and MediaMTX in Docker, then runs FastAPI with
reload at <http://localhost:3000> and Vite at <http://localhost:5173>. Both
application logs stay in the current terminal. Press `Ctrl-C` to stop the
development processes and their local PostgreSQL and MediaMTX containers.
If the command was interrupted, use `make dev-down` to stop the remaining
development containers.

Do not run `make dev` and `make up` at the same time: both modes use the same
backend, database, and media ports.

Default local endpoints:

- dashboard: <http://localhost:8080>;
- backend API: <http://localhost:3000>;
- API documentation: <http://localhost:3000/docs>;
- service status page: <http://localhost:8080/status>;
- MediaMTX RTMP: `rtmp://localhost:1935`;
- MediaMTX HLS: <http://localhost:8888>;
- MediaMTX WebRTC signalling: <http://localhost:8889>.

Compose reads optional overrides from a root `.env` file. Before exposing the
installation beyond a local network, replace the default `POSTGRES_PASSWORD`
and `MEDIA_AUTH_SECRET` values with strong, unique secrets. Do not commit the
`.env` file.

The `postgres-data` and `media-recordings` Docker volumes are kept by
`make down`. Recordings are retained for 30 days by default; configure
`MEDIA_RECORD_RETENTION` in the Compose environment when needed.

## Security and production checklist

Before exposing an installation beyond a local or private network:

- create a root `.env` file with strong, unique `POSTGRES_PASSWORD` and
  `MEDIA_AUTH_SECRET` values, and keep it out of Git;
- use the HTTPS deployment so dashboard sessions have secure cookies and
  browser media uses the same HTTPS origin;
- keep the PostgreSQL port and MediaMTX Control and Playback APIs on loopback
  or an internal network; and
- make regular backups and test the dry-run restore procedure before relying
  on a deployment for an event.

Media connection and playback credentials are short-lived. Private viewer
links are bearer credentials: revoke them when access is no longer needed.

## HTTPS deployment

Use the optional Caddy overlay when the dashboard must be available on a
public HTTPS domain:

```bash
cp deploy/.env.https.example deploy/.env.https
# Edit deploy/.env.https and set the domain, email, and strong secrets.
make https-up
```

Caddy is the public HTTP entry point for the dashboard, API, WebSocket, HLS,
and WebRTC signalling. RTMP publishing uses TCP `1935`; WebRTC media uses UDP
`8189`. Do not run `make up` and `make https-up` on the same host at the same
time. Stop the HTTPS deployment with `make https-down`.

## Backups and restore

Create a timestamped backup of PostgreSQL metadata and MediaMTX recordings:

```bash
make backup
```

Backups are written to `backups/` by default, which is ignored by Git. Use a
different local destination with `BACKUP_DIR=/path/to/backups make backup`.
The backup command only reads running services.

Restore only after stopping the application and verifying the backup:

```bash
make down
RESTORE_DRY_RUN=true make restore BACKUP=backups/20260802T100000Z
make restore BACKUP=backups/20260802T100000Z
make up
```

Restore validates the backup layout, requires a separate `RESTORE`
confirmation, and replaces only the configured PostgreSQL database and
recordings volume. For HTTPS, use `make https-down` and `make https-up` for
the first and last commands instead.

## Makefile commands

Run `make help` for the complete list.

| Command | Purpose |
| --- | --- |
| `make up` | Build and start the complete Docker stack in the background |
| `make down` | Stop and remove the complete Docker stack |
| `make restart` | Recreate the complete Docker stack |
| `make logs` | Follow logs from all Docker services |
| `make install` | Install frontend npm packages and backend Poetry dependencies |
| `make dev` / `make dev-up` | Start Vite, FastAPI, PostgreSQL, and MediaMTX with hot reload |
| `make dev-down` | Stop local development PostgreSQL and MediaMTX |
| `make dev-frontend` | Start the Vite development server |
| `make dev-backend` | Apply migrations and start the FastAPI development server |
| `make db-up` / `make db-down` | Start or stop local PostgreSQL |
| `make media-up` / `make media-down` | Start or stop local MediaMTX |
| `make lint` | Run frontend ESLint and backend Ruff checks |
| `make build` | Build the frontend for production |
| `make backend-check` | Compile-check and import-check the backend |
| `make backend-test` | Run backend regression tests |
| `make backup` | Create a PostgreSQL and recordings backup |
| `make restore BACKUP=...` | Restore a confirmed local backup |
| `make https-up` / `make https-down` | Start or stop the HTTPS deployment |

For separate local frontend/backend development, use the instructions in the
[frontend README](client/README.md) and [backend README](server/README.md).

## Releases

Release tags use the `vMAJOR.MINOR.PATCH` format. A stable release tag builds
the frontend and backend container images and publishes them to GitHub
Container Registry. See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Current limitations

- planned start times do not trigger reminders or automatic starts;
- viewer links are bearer credentials and are not assigned to named attendees;
- recording retention is global rather than per stream;
- WebSocket state, viewer counts, and metrics are local to one backend process;
- backups are on demand and do not yet provide scheduling, remote storage, or
  integrity verification;
- there is no multi-instance backend coordination.
- HLS fallback uses `hls.js` and requires Media Source Extensions; direct
  native HLS playback is deliberately not used because it would expose a
  credential-bearing media URL to the page.

## License

Licensed under the [Apache License 2.0](LICENSE).
