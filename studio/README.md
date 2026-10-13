# rig studio

Local dashboard for a rig gateway — same product shape as [Supabase Studio](https://github.com/supabase/supabase/tree/master/apps/studio):

- Icon rail navigation (Home, Table Editor, SQL Editor, Database, Auth, Storage, API, Settings)
- Dark theme with green accent
- Table grid + insert, read-only SQL, API docs

## Develop

```bash
# terminal 1 — gateway
cd ../examples/server
RIG_DATABASE_URL=sqlite:../../rig.db AUTH_SECRET=dev vaab serve main.vaab

# terminal 2 — UI
npm install
npm run dev
# → http://127.0.0.1:54323
```

## Ship with the gateway

```bash
npm run build
# examples/server serves ../../studio/dist at /
```
