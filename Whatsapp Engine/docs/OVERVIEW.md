# Whatsapp Engine Overview

## What is this?

Whatsapp Engine is a lightweight local service that sits in front of `openclaw-whatsapp` and turns it into a more usable project-level API.

It provides:
- a cleaner REST wrapper for core WhatsApp bridge actions
- inbound webhooks for external systems
- optional outgoing webhook fanout for newly seen messages
- a small, self-contained project structure that is easy to maintain

## Architecture

```text
External app / automation / n8n
        |
        v
   Whatsapp Engine  (:8560)
        |
        v
openclaw-whatsapp bridge (:8555)
        |
        v
      WhatsApp
```

## Main responsibilities

### 1. API wrapper
Whatsapp Engine proxies common bridge functionality like:
- connection status
- QR data access
- chat list
- message search
- sending text replies

### 2. Inbound webhook receiver
External systems can send HTTP requests to Whatsapp Engine to:
- send a WhatsApp text
- send a reply quoting an existing message
- submit a generic event that optionally forwards a WhatsApp message

### 3. Outgoing webhook fanout
If configured, Whatsapp Engine polls the local bridge and forwards newly seen messages to another webhook endpoint.

This is useful for:
- automation platforms
- logging pipelines
- CRM sync
- custom chatbot orchestration

## Why this project exists

The base `openclaw-whatsapp` bridge is already powerful, but project integrations usually need:
- stable project docs
- project-local config
- custom webhook behavior
- a clean surface for other apps and scripts

Whatsapp Engine fills that gap.

## Project layout

```text
Whatsapp Engine/
├── src/        # app source
├── docs/       # docs
├── scripts/    # helpers
├── data/       # local state
└── systemd/    # service templates
```

## Ports

- `8555` → `openclaw-whatsapp`
- `8560` → `Whatsapp Engine`

## Current access model

Local:
- `http://127.0.0.1:8560`

Private remote access via Tailscale:
- `https://armbian.taile13007.ts.net/`

## Security model

Recommended baseline:
- keep `openclaw-whatsapp` behind localhost/private access
- use `WEBHOOK_SECRET` for inbound webhook auth
- prefer Tailscale/private reverse proxy instead of open public exposure

## Operational notes

- `openclaw-whatsapp` must be running first
- `whatsapp-engine.service` depends on the bridge service
- local state is stored in `data/store.json`
