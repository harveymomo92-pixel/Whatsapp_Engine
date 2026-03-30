# CHANGELOG.md - Whatsapp Engine

All notable changes to this project should be recorded here.

## [Unreleased]

- Added continuity files for future work:
  - `NEXT.md`
  - `ROADMAP.md`
  - `CHANGELOG.md`
  - `DECISIONS.md`

## [0.1.0] - 2026-03-30

Initial usable project baseline.

### Added
- local Node.js API wrapper around `openclaw-whatsapp`
- REST endpoints for status, QR, chats, messages, search, send, and reply
- inbound webhook endpoints for send/reply/generic event
- optional outgoing webhook fanout by polling
- systemd user service: `whatsapp-engine.service`
- project documentation set under `docs/`
- Tailscale private reverse proxy access
- GitHub repo setup and SSH-based access

### Operational setup
- `openclaw-whatsapp` running on port `8555`
- `Whatsapp Engine` wrapper running on port `8560`

### Notes
- repo was cleaned to keep project files only
- `.env` is intentionally not tracked
