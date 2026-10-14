# rig studio

Local dashboard for a rig gateway. Graphite console, tungsten accent, IBM Plex.

- Pedalboard nav (icons / full labels, `rig.studio.nav`, ⌘B, mobile sheet)
- Table Editor, SQL Editor (CodeMirror), Auth, Storage, API, Settings
- Served under `/studio/`

## Develop

```bash
# terminal 1 — gateway
cd ../examples/server
RIG_DATABASE_URL=sqlite:../../rig.db AUTH_SECRET=dev vaab serve main.vaab

# terminal 2 — UI
npm install
npm run dev
# → http://127.0.0.1:54323/studio/
```

Studio Basic auth on the gateway: `admin` / `secret`.

## Ship with the gateway

```bash
npm run build
# examples/server serves ../../studio/dist at /studio/
```
