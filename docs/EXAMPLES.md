# Whatsapp Engine Examples

## 1. Health check

```bash
curl http://127.0.0.1:8560/health
```

## 2. WhatsApp connection status

```bash
curl http://127.0.0.1:8560/api/status
```

## 3. List chats

```bash
curl http://127.0.0.1:8560/api/chats
```

## 4. Read messages from a chat

```bash
curl "http://127.0.0.1:8560/api/chats/6281234567890@s.whatsapp.net/messages?limit=20"
```

## 5. Search messages

```bash
curl "http://127.0.0.1:8560/api/messages/search?q=invoice"
```

## 6. Send a text message

```bash
curl -X POST http://127.0.0.1:8560/api/send/text \
  -H 'Content-Type: application/json' \
  -d '{"to":"6281234567890@s.whatsapp.net","message":"Halo dari Whatsapp Engine"}'
```

## 7. Reply to a specific message

```bash
curl -X POST http://127.0.0.1:8560/api/reply \
  -H 'Content-Type: application/json' \
  -d '{"to":"6281234567890@s.whatsapp.net","message":"Siap, saya lanjutkan.","quote_message_id":"ABC123"}'
```

## 8. Inbound webhook to send text

Without secret:

```bash
curl -X POST http://127.0.0.1:8560/webhooks/inbound/send-text \
  -H 'Content-Type: application/json' \
  -d '{"to":"6281234567890@s.whatsapp.net","message":"Webhook says hello"}'
```

With secret:

```bash
curl -X POST http://127.0.0.1:8560/webhooks/inbound/send-text \
  -H 'Content-Type: application/json' \
  -H 'x-webhook-secret: YOUR_SECRET' \
  -d '{"to":"6281234567890@s.whatsapp.net","message":"Webhook says hello"}'
```

## 9. Inbound webhook generic event

```bash
curl -X POST http://127.0.0.1:8560/webhooks/inbound/event \
  -H 'Content-Type: application/json' \
  -d '{
    "type":"deploy.finished",
    "message":"Deployment completed",
    "send": {
      "to":"6281234567890@s.whatsapp.net",
      "message":"Deploy selesai"
    }
  }'
```

## 10. Access through Tailscale

```text
https://armbian.taile13007.ts.net/
```

Example:

```bash
curl https://armbian.taile13007.ts.net/health
```
