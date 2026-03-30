# Whatsapp Engine

Small local Node.js API wrapper and webhook engine around `openclaw-whatsapp`.

Documentation index:
- `docs/README.md`
- `docs/OVERVIEW.md`
- `docs/SETUP.md`
- `docs/API.md`
- `docs/WEBHOOKS.md`
- `docs/EXAMPLES.md`
- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS.md`

## What it does

- Proxies core bridge APIs from `openclaw-whatsapp`
- Adds simple inbound webhook endpoints for external systems
- Adds optional outgoing webhook fanout by polling local chats/messages
- Keeps a tiny local state file for dedupe/checkpointing

## Endpoints

- `GET /health`
- `GET /api/status`
- `GET /api/qr`
- `GET /api/chats`
- `GET /api/chats/:jid/messages?limit=20`
- `GET /api/messages/search?q=hello`
- `POST /api/send/text` `{ "to": "628...", "message": "hi" }`
- `POST /api/reply` `{ "to": "628...@s.whatsapp.net", "message": "hi", "quote_message_id": "..." }`
- `POST /webhooks/inbound/send-text`
- `POST /webhooks/inbound/reply`
- `POST /webhooks/inbound/event`

## Inbound webhook examples

### Send text
```bash
curl -X POST http://127.0.0.1:8560/webhooks/inbound/send-text \
  -H 'Content-Type: application/json' \
  -d '{"to":"6281234567890@s.whatsapp.net","message":"hello"}'
```

### Reply
```bash
curl -X POST http://127.0.0.1:8560/webhooks/inbound/reply \
  -H 'Content-Type: application/json' \
  -d '{"to":"6281234567890@s.whatsapp.net","message":"hello back","quote_message_id":"ABC123"}'
```

### Generic event
```bash
curl -X POST http://127.0.0.1:8560/webhooks/inbound/event \
  -H 'Content-Type: application/json' \
  -d '{"type":"notify","message":"pipeline finished","send":{"to":"6281234567890@s.whatsapp.net","message":"job done"}}'
```

## Optional auth

If `WEBHOOK_SECRET` is set, inbound webhook requests must include:

- Header: `x-webhook-secret: <secret>`

## Outgoing fanout

If `OUTGOING_WEBHOOK_URL` is set, the wrapper polls the local bridge and POSTs newly seen messages/chats to your webhook.

Payload shape:
```json
{
  "type": "whatsapp.message",
  "source": "whatsapp-engine",
  "chat": {},
  "message": {},
  "seenAt": "2026-03-30T00:00:00.000Z"
}
```

Optional bearer token header is added from `OUTGOING_WEBHOOK_TOKEN`.

## Project structure

- `src/` → app source
- `docs/` → API and deployment notes
- `scripts/` → helper scripts
- `data/` → local state/cache
- `systemd/` → service unit template

## Run

```bash
cd "/root/.openclaw/workspace/Whatsapp Engine"
cp .env.example .env
node src/server.js
```

## Notes

- Wrapper expects local bridge at `http://127.0.0.1:8555`
- Do not expose bridge or wrapper publicly without auth/reverse proxy
- This project uses only built-in Node modules for portability
- For deployment/service details, see `docs/DEPLOYMENT.md`
- For endpoint reference, see `docs/API.md`
