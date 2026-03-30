# Deployment Notes

## Services

- Bridge: `openclaw-whatsapp.service`
- Wrapper: `whatsapp-engine.service`

## Start / restart

```bash
systemctl --user restart openclaw-whatsapp.service
systemctl --user restart whatsapp-engine.service
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

## WhatsApp auto-reply allowlist

Current bridge behavior:
- auto-reply remains enabled in `openclaw-whatsapp`
- but it is restricted with an allowlist

Current allowed number:
- `6282221888321`

That means only this DM contact should trigger the OpenClaw auto-reply worker.
Other contacts should not trigger automatic replies.
