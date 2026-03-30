# Whatsapp Engine Webhooks

## Inbound webhooks

Inbound webhooks are requests sent *to* Whatsapp Engine by your own apps, automations, or external systems.

### Endpoints

#### `POST /webhooks/inbound/send-text`
Send a new text message.

Body:
```json
{
  "to": "6281234567890@s.whatsapp.net",
  "message": "hello"
}
```

#### `POST /webhooks/inbound/reply`
Send a reply to a chat, optionally quoting a message.

Body:
```json
{
  "to": "6281234567890@s.whatsapp.net",
  "message": "hello back",
  "quote_message_id": "ABC123"
}
```

#### `POST /webhooks/inbound/event`
Send a generic event payload into Whatsapp Engine.

If body contains:
```json
{
  "send": {
    "to": "6281234567890@s.whatsapp.net",
    "message": "job done"
  }
}
```

then Whatsapp Engine forwards it to WhatsApp.

## Authentication

If `WEBHOOK_SECRET` is configured, send this header:

```text
x-webhook-secret: YOUR_SECRET
```

If the secret is wrong or missing, the wrapper returns `401 Unauthorized`.

## Outgoing webhook fanout

If `OUTGOING_WEBHOOK_URL` is configured, Whatsapp Engine polls recent chats/messages from the local bridge and forwards newly seen messages to your external endpoint.

### Example payload

```json
{
  "type": "whatsapp.message",
  "source": "whatsapp-engine",
  "chat": {},
  "message": {},
  "seenAt": "2026-03-30T00:00:00.000Z"
}
```

### Optional auth to target webhook

If `OUTGOING_WEBHOOK_TOKEN` is set, the wrapper sends:

```text
Authorization: Bearer <token>
```

## Important notes

- Outgoing fanout is polling-based, not event-stream-based
- Deduplication is stored in `data/store.json`
- This is intentionally simple and good enough for project integrations
