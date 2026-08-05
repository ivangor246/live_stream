# Changelog

All notable changes to Live Stream Monitor are documented in this file.

The project follows [Semantic Versioning](https://semver.org/) and uses
release tags in the `vMAJOR.MINOR.PATCH` format.

## [0.1.0] - 2026-08-05

### Added

- Self-hosted React, FastAPI, PostgreSQL, and MediaMTX deployment with Docker
  Compose.
- Manual stream lifecycle management with optional informational start times
  stored in UTC.
- RTMP publishing, WebRTC playback, and protected HLS fallback with short-lived
  media credentials.
- Roles, HttpOnly dashboard sessions, one-time account invitations, private
  viewer links, and protected recording playback.
- fMP4 recording archive, safe CSV/JSON exports, local backups, JSON logs,
  Prometheus-compatible metrics, and a public service-status page.
- English/Russian localization, light/dark themes, frontend route splitting,
  and responsive mobile layouts.
- Apache License 2.0 and GitHub Actions checks for frontend, backend, and
  Docker smoke tests.
