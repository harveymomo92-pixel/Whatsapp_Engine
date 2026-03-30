# Whatsapp Engine Setup Guide

## Prerequisites

- Linux host with systemd user services
- `openclaw-whatsapp` already installed
- WhatsApp already linked through QR
- Node.js available at `/usr/bin/node`

## Project path

```bash
/root/.openclaw/workspace/Whatsapp Engine
```

## Configuration

Copy example env if needed:

```bash
cd "/root/.openclaw/workspace/Whatsapp Engine"
cp .env.example .env
```

### Available environment variables

- `PORT` → wrapper port, default `8560`
- `BRIDGE_BASE_URL` → bridge base URL, default `http://127.0.0.1:8555`
- `WEBHOOK_SECRET` → optional shared secret for inbound webhooks
- `OUTGOING_WEBHOOK_URL` → optional target for outgoing fanout
- `OUTGOING_WEBHOOK_TOKEN` → optional bearer token for outgoing fanout
- `POLL_INTERVAL_MS` → polling interval for fanout, default `5000`
- `STORE_PATH` → path to local state store

## Run manually

```bash
cd "/root/.openclaw/workspace/Whatsapp Engine"
node src/server.js
```

Or:

```bash
cd "/root/.openclaw/workspace/Whatsapp Engine"
./scripts/dev-start.sh
```

## Run with systemd

Installed user service:

```bash
systemctl --user status whatsapp-engine.service
systemctl --user restart whatsapp-engine.service
```

Template unit file is stored here:

```bash
/root/.openclaw/workspace/Whatsapp Engine/systemd/whatsapp-engine.service
```

## Verify

```bash
curl http://127.0.0.1:8560/health
curl http://127.0.0.1:8560/api/status
```

## Tailscale private access

Current private URL:

```text
https://armbian.taile13007.ts.net/
```

This URL is reverse-proxied to the local wrapper on port `8560`.

## Restart order

If things break, restart in this order:

```bash
systemctl --user restart openclaw-whatsapp.service
systemctl --user restart whatsapp-engine.service
```
