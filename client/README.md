# Live Stream Monitor Frontend

The `client` directory contains the browser dashboard for Live Stream Monitor.
It is a React and TypeScript application built with Vite and served from an
Nginx image in the Docker deployment.

## Responsibilities

- guide the first administrator setup and sign-in flow;
- protect dashboard routes using the authenticated session state;
- show stream lists, filters, lifecycle actions, viewer counts, and reactions;
- display RTMP publishing details only in the roles allowed to use them;
- play live streams through WebRTC and fall back to HLS when WebRTC is not
  available;
- show protected recordings and private viewer-link pages;
- reconnect the dashboard WebSocket after temporary failures with a bounded
  exponential backoff;
- provide account, invitation, export, and service-status screens;
- keep all visible user text in the Russian/English localization layer.

The frontend sends media credentials in request headers after removing them
from browser-visible media URLs. The backend remains responsible for issuing
and validating those short-lived credentials.

## Technology

- React 19;
- TypeScript;
- Vite;
- React Router;
- browser WebSocket API;
- `hls.js`, loaded only when HLS fallback is needed;
- CSS custom properties and reusable local UI components.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Authenticated stream list and stream management |
| `/streams/:streamId` | Authenticated stream details, player, connection, and archive |
| `/invite/:token` | One-time account invitation acceptance |
| `/watch/:token` | Private viewer-link playback without a dashboard account |
| `/status` | Public aggregate service status |

## Source layout

```text
src/
  api/              typed HTTP clients for authentication and streams
  auth/             session state and route protection
  components/       feature, layout, player, and reusable UI components
    layout/         application shell, language, theme, and service status
    ui/              local component library
  hooks/            client hooks, including dashboard WebSocket state
  i18n/             English/Russian resources and translation state
  pages/            route-level screens
  shared/           frontend-owned API, stream, auth, and WebSocket contracts
  theme/            light/dark theme state
  types/            frontend-only types
```

`src/shared` is the frontend contract boundary. The backend does not import
these TypeScript files; it validates its own external data with Pydantic.

## Development

Requirements: Node.js 22 or newer and npm.

Install dependencies and start Vite from this directory:

```bash
npm ci
npm run dev
```

The Vite development server runs at <http://localhost:5173>. It proxies
`/api` to `http://localhost:3000` and `/ws` to the backend WebSocket, so run
the backend separately when using the dashboard against local services. The
frontend build itself does not require a running Python process or a running
backend.

Available npm checks:

```bash
npm run lint
npm run build
npm run preview
```

The equivalent root-level commands are `make install-frontend`,
`make dev-frontend`, `make lint`, and `make build`. To run the complete Docker
stack with one command, use `make up` from the repository root.

## Localization and theme

The initial locale is selected from `navigator.languages` and
`navigator.language`. Russian is used for `ru-*`, English for `en-*`, and
English is the fallback for every other language. An explicit language choice
is stored in `localStorage`.

The theme has explicit light and dark choices. When no choice has been saved,
the initial theme follows `prefers-color-scheme`; the explicit choice is then
stored in `localStorage`.

Visual changes should use the shared CSS tokens in `src/index.css` or a
component variant. Reusable controls such as `Button`, `ButtonLink`, `Card`,
`CopyField`, and `StatusBadge` live under `src/components/ui`.

## WebSocket behavior

The stream page joins the dashboard WebSocket with a generated viewer ID and
receives viewer-count, reaction, and stream-status events for the selected
stream. Reconnect attempts use delays from one to fifteen seconds. The hook
clears its timer when the component unmounts, does not create duplicate
timers, stops when the stream finishes, and does not retry a policy close
caused by an invalid or expired session.

## Container build

`Dockerfile` builds the static application with Node.js and serves the result
with Nginx. The image is built independently from the backend and can be
checked with:

```bash
docker build -t live-stream-frontend ./client
```

The repository-level CI runs `npm ci`, ESLint, and the production build for
this component.
