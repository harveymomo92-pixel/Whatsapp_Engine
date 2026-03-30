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

## Autostart after reboot

Ensure the service starts automatically without manual intervention:

```bash
loginctl enable-linger root
systemctl --user daemon-reload
systemctl --user enable openclaw-whatsapp.service
systemctl --user enable whatsapp-engine.service
```

Verify:
```bash
systemctl --user is-enabled openclaw-whatsapp.service
systemctl --user is-enabled whatsapp-engine.service
loginctl show-user root | grep Linger
```

## Restart

```bash
systemctl --user restart openclaw-whatsapp.service
systemctl --user restart whatsapp-engine.service
```

## Logs

Structured engine log:
```bash
tail -f /root/.openclaw/workspace/Whatsapp\ Engine/data/engine.log
```

Store/debug state:
```bash
cat /root/.openclaw/workspace/Whatsapp\ Engine/data/store.json
curl http://127.0.0.1:8560/api/debug/store
```

## Health checks

```bash
curl http://127.0.0.1:8555/status
curl http://127.0.0.1:8560/health
curl http://127.0.0.1:8560/api/status
curl http://127.0.0.1:8560/api/debug/store
```

## Tailscale Serve

Check current private exposure:

```bash
tailscale serve status
```

Current route:
- `https://armbian.taile13007.ts.net/` → `http://127.0.0.1:8560`

## Common problems

### Engine starts but incoming sync is empty
Check:
- bridge is running
- JID route handling in the engine is using the bridge-compatible path format
- `/api/debug/store` shows `lastPollAt` moving forward

Useful commands:
```bash
curl http://127.0.0.1:8560/api/debug/store
curl "http://127.0.0.1:8555/chats/<jid>/messages?limit=5"
```

### Duplicate forwarded messages
Check engine log for overlap behavior:
```bash
grep poll_skipped_overlap /root/.openclaw/workspace/Whatsapp\ Engine/data/engine.log | tail
```

The engine now prevents overlapping poll cycles, which should stop duplicate sends during heavy backfill.

### Bootstrap flooding old messages
Use bootstrap mark-seen mode in `.env`:
```env
BOOTSTRAP_MARK_SEEN_ONLY=true
```

With this enabled, the first sync marks backlog messages as seen without forwarding them all. After the first poll completes, the engine resumes normal forwarding for new messages.

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
