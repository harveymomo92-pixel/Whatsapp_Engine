# ROADMAP

## v0.2 Priorities

### 1. Reliable Delivery
- add webhook retry with exponential backoff
- add durable failed-delivery queue on disk
- expose queue size and retry stats in debug output

### 2. Filtering & Routing
- support allow/deny filtering by chat JID
- support modes such as DM-only, group-only, or selected groups
- allow per-target routing rules for downstream webhooks

### 3. Observability
- expand `/api/debug/store` with counters for forwarded, skipped, failed, retried
- keep structured event log in `data/engine.log`
- add a lightweight health/debug checklist for operators

## v0.2 Secondary
- improve bootstrap-first-run flow so first deployment can auto-mark backlog as seen safely
- strengthen deduplication with delivery markers/idempotency safeguards
- improve media payload normalization for image/video/audio/document events

## v0.3 Direction
- evaluate event-driven bridge integration if the upstream bridge exposes reliable inbound hooks/events
- add signed webhook delivery / stronger request authentication
- add config validation at startup with clear failure messages
