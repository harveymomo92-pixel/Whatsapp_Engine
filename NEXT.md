# NEXT

## Immediate
1. Implement webhook retry/backoff with durable failed-delivery queue.
2. Add chat filtering controls (allowlist/denylist, DM-only/group-only, selected groups).
3. Expand `/api/debug/store` with delivery counters and failure statistics.

## After that
4. Improve bootstrap-first-run behavior so backlog handling is safer and more automatic.
5. Strengthen deduplication with delivery markers/idempotency safeguards.
6. Improve media payload normalization for video/audio/document events.

## Later
7. Add startup config validation with clearer operator errors.
8. Explore event-driven bridge integration if upstream supports reliable inbound events.
