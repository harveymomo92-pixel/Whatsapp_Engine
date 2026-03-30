# DECISIONS.md - Whatsapp Engine

This file records key decisions so future work does not need to rediscover them.

---

## Decision: each project gets its own folder

Status: accepted

Reason:
- reduces clutter
- makes repo/project boundaries easier to understand
- makes future continuation simpler

Applied to this project as:
- project folder name: `Whatsapp Engine`

---

## Decision: project name is `Whatsapp Engine`

Status: accepted

Reason:
- user explicitly chose this naming convention
- should be used consistently in future work and references

---

## Decision: use Node.js with built-in modules for wrapper

Status: accepted

Reason:
- Node.js is already available on the host
- reduced dependency complexity
- enough for current lightweight HTTP proxy/webhook needs

Tradeoff:
- less ergonomic than a framework
- but simpler and more portable right now

---

## Decision: keep `openclaw-whatsapp` as the underlying bridge

Status: accepted

Reason:
- bridge already provides WhatsApp connectivity and core APIs
- wrapper should add project-specific integration behavior, not replace the bridge

Implication:
- `Whatsapp Engine` depends on the bridge service and port `8555`

---

## Decision: expose wrapper privately through Tailscale

Status: accepted

Reason:
- safer than public internet exposure
- already available on the host
- quick operational path with HTTPS and stable tailnet URL

Current endpoint:
- `https://armbian.taile13007.ts.net/`

---

## Decision: use systemd user service

Status: accepted

Service name:
- `whatsapp-engine.service`

Reason:
- keeps the engine persistent and restartable
- aligns with host setup already used for the bridge

---

## Decision: GitHub auth should use SSH going forward

Status: accepted

Reason:
- avoids repeated PAT sharing
- safer and more convenient for ongoing pushes from the server

Implication:
- repo remote should remain SSH-based
- token-based access should be avoided unless explicitly needed again

---

## Decision: repo should contain project files only

Status: accepted

Reason:
- workspace contains private assistant/local continuity files
- those should not be committed to the project repository

Do not commit:
- workspace-private assistant files
- memory files
- local `.env`
- unrelated project folders

---

## Decision: continuity should live in files, not just chat

Status: accepted

Reason:
- future sessions start fresh
- docs and continuity files preserve progress better than relying on chat history alone

Files used for this:
- `README.md`
- `docs/*`
- `NEXT.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `DECISIONS.md`
