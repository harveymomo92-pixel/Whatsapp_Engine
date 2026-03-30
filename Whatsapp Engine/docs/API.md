# Whatsapp Engine API

Base URL lokal:
- `http://127.0.0.1:8560`

## Health

`GET /health`

## Bridge status

`GET /api/status`

## QR data

`GET /api/qr`

## Chats

`GET /api/chats`

## Chat messages

`GET /api/chats/:jid/messages?limit=20`

## Search messages

`GET /api/messages/search?q=keyword`

## Send text

`POST /api/send/text`

Body:
```json
{
  "to": "6281234567890@s.whatsapp.net",
  "message": "halo"
}
```

## Reply

`POST /api/reply`

Body:
```json
{
  "to": "6281234567890@s.whatsapp.net",
  "message": "siap",
  "quote_message_id": "ABC123"
}
```

## Inbound webhooks

### Send text
`POST /webhooks/inbound/send-text`

### Reply
`POST /webhooks/inbound/reply`

### Generic event
`POST /webhooks/inbound/event`

Jika `WEBHOOK_SECRET` di-set, kirim header:
- `x-webhook-secret: <secret>`
