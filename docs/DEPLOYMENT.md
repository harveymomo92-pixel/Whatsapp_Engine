# Deployment Notes

## Services

- Bridge: `openclaw-whatsapp.service`
- Wrapper: `whatsapp-engine.service`

## Start / restart

```bash
systemctl --user restart openclaw-whatsapp.service
systemctl --user restart whatsapp-engine.service
```

## Enable on boot / restart survival

To ensure both services come back automatically after system restart and do not require manual start:

```bash
loginctl enable-linger root
systemctl --user daemon-reload
systemctl --user enable openclaw-whatsapp.service
systemctl --user enable whatsapp-engine.service
```

Confirm:
```bash
systemctl --user is-enabled openclaw-whatsapp.service
systemctl --user is-enabled whatsapp-engine.service
loginctl show-user root | grep Linger
```

## Status

```bash
systemctl --user status openclaw-whatsapp.service
systemctl --user status whatsapp-engine.service
```

## Local ports

- `8555` → openclaw-whatsapp bridge
- `8560` → Whatsapp Engine wrapper

## Reverse proxy

This host already has Tailscale installed, so private exposure is best done via Tailscale Serve/Funnel.

Suggested private URL flow:
- Tailscale HTTPS endpoint → `http://127.0.0.1:8560`

## Security

- Do not expose raw bridge `:8555` directly to public internet.
- Prefer protecting wrapper with webhook secret and/or private tailnet access.
- If public exposure is needed later, put Caddy/Nginx in front with auth/TLS/rate limits.

## Incoming sync behavior

Current behavior:
- polling-based incoming sync
- bridge-compatible JID routing for `/chats/:jid/messages`
- overlap protection to prevent duplicate sends from concurrent poll cycles
- optional bootstrap mode to mark backlog as seen without forwarding everything

Relevant `.env` options:
```env
POLL_INTERVAL_MS=2000
POLL_MESSAGE_LIMIT=20
BOOTSTRAP_MARK_SEEN_ONLY=false
OUTGOING_WEBHOOK_URL=http://127.0.0.1:8570/webhook/whatsapp
LOG_PATH=./data/engine.log
```

For a brand-new deployment where you do not want to forward historical backlog immediately, temporarily set:
```env
BOOTSTRAP_MARK_SEEN_ONLY=true
```
Then restart the service. After the first sync completes, set it back to `false` for normal forwarding of only new messages.

## WhatsApp auto-reply allowlist

Current bridge behavior:
- auto-reply remains enabled in `openclaw-whatsapp`
- but it is restricted with an allowlist

Current allowed number:
- `6282221888321`

That means only this DM contact should trigger the OpenClaw auto-reply worker.
Other contacts should not trigger automatic replies.
