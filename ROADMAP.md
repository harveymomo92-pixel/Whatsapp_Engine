# ROADMAP.md - Whatsapp Engine

## Vision

Whatsapp Engine should become a clean, reusable integration layer on top of `openclaw-whatsapp` for automations, bots, and external systems.

The goal is to make WhatsApp operations predictable, documented, and easy to integrate without exposing the raw bridge directly.

## Current stage

Stage: **usable prototype / internal integration-ready**

Already done:
- basic wrapper service
- inbound webhook endpoints
- optional outgoing webhook fanout
- systemd service
- docs baseline
- GitHub repo setup
- SSH-based GitHub access
- private Tailscale exposure

## Near-term priorities

### P1 - stability and hygiene
- [ ] retag `v0.1.0` to final clean commit if desired
- [ ] add repository `LICENSE`
- [ ] improve `.gitignore`
- [ ] add basic validation for request payloads
- [ ] add safer logging strategy

### P2 - API improvements
- [ ] add media/file send endpoint support
- [ ] add better error mapping from bridge responses
- [ ] add explicit config endpoint / runtime info endpoint
- [ ] add optional health detail endpoint

### P3 - integration quality
- [ ] write n8n integration guide
- [ ] write OpenAPI/Swagger spec
- [ ] add Postman collection
- [ ] add example webhook consumer payload contracts

### P4 - security hardening
- [ ] strengthen inbound webhook auth
- [ ] add token rotation guidance
- [ ] add optional IP allowlist support
- [ ] review exposure model before any public deployment

### P5 - packaging and release quality
- [ ] create GitHub Release for `v0.1.0`
- [ ] add release notes process
- [ ] add changelog discipline for future changes
- [ ] consider separating project repo from workspace-local folder conventions more cleanly

## Longer-term ideas

- [ ] support richer webhook event model
- [ ] support message templates / reusable workflows
- [ ] add queue/retry behavior for outbound webhook fanout
- [ ] support multi-tenant or multi-number architecture if ever needed
- [ ] add test suite

## Non-goals for now

- no public internet exposure by default
- no heavy framework unless really needed
- no premature database complexity beyond current simple state needs

## Success criteria

Whatsapp Engine is in a strong state when:
- docs are enough for a new integrator to start quickly
- webhook auth is safe enough for practical use
- API behavior is predictable
- repo stays project-only and clean
- future sessions can continue work from docs + NEXT.md alone
