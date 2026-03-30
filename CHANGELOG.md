# CHANGELOG

## 2026-03-30
- fixed incoming polling bug caused by encoded chat JIDs (`@` becoming `%40`)
- added webhook diagnostics and internal engine log at `data/engine.log`
- added debug endpoint `GET /api/debug/store`
- improved outgoing payload normalization for loging-inbox compatibility
- reduced polling interval to 2000 ms
- added overlap protection so concurrent poll cycles do not double-send the same message
