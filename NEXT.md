# NEXT.md - Whatsapp Engine

## Current status

Project name: **Whatsapp Engine**

What already exists:
- `openclaw-whatsapp` bridge installed and running on port `8555`
- WhatsApp account linked and working
- wrapper service running on port `8560`
- systemd user service name: `whatsapp-engine.service`
- private reverse proxy via Tailscale Serve
- GitHub repo connected via SSH
- project docs created in `docs/`

## Current important paths

Local project folder:
- `/root/.openclaw/workspace/Whatsapp Engine`

GitHub repo:
- `git@github.com:harveymomo92-pixel/Whatsapp_Engine.git`
- HTTPS: `https://github.com/harveymomo92-pixel/Whatsapp_Engine.git`

Private URL:
- `https://armbian.taile13007.ts.net/`

## Services and ports

- Bridge: `openclaw-whatsapp.service` → `:8555`
- Engine: `whatsapp-engine.service` → `:8560`

Useful commands:
```bash
systemctl --user status openclaw-whatsapp.service
systemctl --user status whatsapp-engine.service
curl http://127.0.0.1:8560/health
curl http://127.0.0.1:8560/api/status
tailscale serve status
```

## Important working rule

For every new project, create a separate folder.
For this project, use the name exactly:
- `Whatsapp Engine`

## Suggested next tasks

Pick up from one of these:
1. Retag `v0.1.0` to the final clean commit if needed
2. Create a proper GitHub Release
3. Add `LICENSE`
4. Add better `.gitignore` and repo hygiene checks
5. Add auth improvements for webhook endpoints
6. Add media/file send support
7. Add OpenAPI/Swagger spec
8. Add n8n integration guide
9. Add public reverse proxy only if explicitly requested

## Notes for future continuation

When resuming, first review:
- `README.md`
- `docs/README.md`
- this file: `NEXT.md`

Suggested resume prompt:
```text
Lanjut Whatsapp Engine, baca README, docs, dan NEXT.md dulu.
```
