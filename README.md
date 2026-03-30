# Whatsapp Engine

[![Platform](https://img.shields.io/badge/platform-OpenClaw%20%2B%20WhatsApp-25D366)](https://github.com/harveymomo92-pixel/Whatsapp_Engine)
[![Runtime](https://img.shields.io/badge/runtime-Node.js-339933)](https://nodejs.org/)
[![Access](https://img.shields.io/badge/access-Tailscale%20Private-4C8EFF)](https://tailscale.com/)

Whatsapp Engine is a lightweight API wrapper and webhook layer for `openclaw-whatsapp`.

It provides:
- REST endpoints for status, chats, messages, search, send, and reply
- inbound webhook endpoints for external systems
- optional outgoing webhook fanout for newly seen messages
- project docs and deployment notes

## Architecture

```text
External apps / automations / n8n
        |
        v
   Whatsapp Engine (:8560)
        |
        v
openclaw-whatsapp bridge (:8555)
        |
        v
      WhatsApp
```

## Main endpoints

- `GET /health`
- `GET /api/status`
- `GET /api/chats`
- `GET /api/chats/:jid/messages?limit=20`
- `GET /api/messages/search?q=...`
- `POST /api/send/text`
- `POST /api/reply`
- `POST /webhooks/inbound/send-text`
- `POST /webhooks/inbound/reply`
- `POST /webhooks/inbound/event`

## Documentation

- [`docs/README.md`](./docs/README.md)
- [`docs/OVERVIEW.md`](./docs/OVERVIEW.md)
- [`docs/SETUP.md`](./docs/SETUP.md)
- [`docs/API.md`](./docs/API.md)
- [`docs/WEBHOOKS.md`](./docs/WEBHOOKS.md)
- [`docs/EXAMPLES.md`](./docs/EXAMPLES.md)
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
- [`docs/OPERATIONS.md`](./docs/OPERATIONS.md)

## Quick start

```bash
cp .env.example .env
node src/server.js
```

## Current private access

- Local: `http://127.0.0.1:8560`
- Tailscale: `https://armbian.taile13007.ts.net/`

## Services

```bash
systemctl --user status openclaw-whatsapp.service
systemctl --user status whatsapp-engine.service
```
