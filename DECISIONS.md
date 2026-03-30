# DECISIONS

## 2026-03-30
- Keep polling architecture for now, but harden it with diagnostics and overlap protection before considering a true event-driven bridge.
- Preserve a lightweight file-based seen-message store in `data/store.json` for restart resilience.
- Normalize incoming bridge messages into a stable webhook payload so downstream services do not depend on bridge-specific field variations.
- Avoid percent-encoding WhatsApp JIDs in the `/chats/:jid/messages` bridge route because the current bridge expects raw `@` in the path.
