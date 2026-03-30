# Whatsapp Engine Operations

## Services

Bridge service:
```bash
systemctl --user status openclaw-whatsapp.service
```

Engine service:
```bash
systemctl --user status whatsapp-engine.service
```

## Restart

```bash
systemctl --user restart openclaw-whatsapp.service
systemctl --user restart whatsapp-engine.service
```

## Logs

```bash
journalctl --user -u openclaw-whatsapp.service -n 100 --no-pager
journalctl --user -u whatsapp-engine.service -n 100 --no-pager
```

## Health checks

```bash
curl http://127.0.0.1:8555/status
curl http://127.0.0.1:8560/health
curl http://127.0.0.1:8560/api/status
```

## Tailscale Serve

Check current private exposure:

```bash
tailscale serve status
```

Current route:
- `https://armbian.taile13007.ts.net/` → `http://127.0.0.1:8560`

## Common problems

### Engine starts but endpoint fails
Check that the bridge is running:
```bash
systemctl --user status openclaw-whatsapp.service
```

### Port conflict on `8560`
Check listeners:
```bash
ss -ltnp | grep 8560
```

### WhatsApp disconnected
Check bridge status:
```bash
openclaw-whatsapp status
```

If needed, restart bridge and relink WhatsApp.

### Unexpected auto-reply behavior
Check bridge allowlist in:
```bash
/root/.openclaw-whatsapp/config.yaml
```

Current intended rule:
- auto-reply is enabled
- only `6282221888321` is allowlisted

After changing allowlist settings:
```bash
systemctl --user restart openclaw-whatsapp.service
```

### Webhooks not authorized
Check `WEBHOOK_SECRET` in `.env` and ensure request header matches.
