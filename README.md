# rig

Official **rig** riff for [Vaab](https://github.com/vaab-lang/vaab): a Supabase-shaped
backend you mount from a `serve` block.

In the Vaab naming world:

| Name | Role |
|------|------|
| **riff** | The package kind (`riff install …`) |
| **tape** | Static file helpers for `reply file` |
| **supabase** | Thin *client* to hosted Supabase/PostgREST |
| **rig** | Your own backline — data API, auth adapter, object paths |

A musician rolls in a **rig** (amp, pedals, tape deck). Apps `need rig` the same
way they `need tape`.

## Install

```bash
riff install rig
```

Dedicated repo: [github.com/vaab-lang/rig](https://github.com/vaab-lang/rig)  
Catalog: [riff.vaab.dev](https://riff.vaab.dev) (install counts stored via rig itself)

## What it gives you

| Supabase piece | Rig |
|----------------|-----|
| Postgres + PostgREST | `Db` + `rig.list` / `get` / `insert_*` / `remove` over allow-listed tables |
| Auth (GoTrue) | `rig.require_user(request.who)` on Vaab’s builtin bearer auth |
| Storage | `rig.resolve_object(root, path)` for `/storage/v1/object/...` |
| Edge Functions | Your own `route` blocks in Vaab |
| Realtime | Language `Hub` / `socket` (planned) — not duplicated here |
| Studio | [`studio/`](studio/) dashboard (Table / SQL / Auth / Storage / API) |

## Same shape as tape

`tape` does not open the HTTP server — your `serve` block does, then calls
`tape.resolve` before `reply file`.

`rig` is the same split for data: your `serve` block mounts routes, then calls
`rig.open_db(client)` / `rig.list` / … Auth stays `request.who`; rig only adapts
it. **Requires Vaab ≥ 0.1.4** (linked-riff Db / NodeId fixes).

## Example mount + Studio

See the full gateway demo in [`examples/server`](examples/server)
(Supabase-shaped `/auth`, `/rest`, `/storage` on port `54321`, plus a Studio UI).

```bash
cd studio && npm install && npm run build && cd ..
cd examples/server
/path/to/vaab gather
RIG_DATABASE_URL=sqlite:../../rig.db AUTH_SECRET=dev \
  /path/to/vaab serve main.vaab
```

Open **http://127.0.0.1:54321/** for rig Studio (icon rail: Table Editor, SQL,
Auth, Storage, API Docs — same shape as Supabase Studio).

```bash
curl -s localhost:54321/health
curl -s localhost:54321/auth/v1/health
curl -s localhost:54321/rest/v1/todos
curl -s localhost:54321/studio-api/tables
```

For UI hot-reload against a running gateway:

```bash
cd studio && npm run dev   # http://127.0.0.1:54323 → proxies API to :54321
```

## API

| Call | Purpose |
|------|---------|
| `rig.connect()` / `connect_with` | `RIG_DATABASE_URL` + optional `RIG_STORAGE_ROOT` |
| `rig.open_db(client)` / `open_url` | Open the DB and ensure `rig` tables exist |
| `rig.ensure_schema(db)` | Create `profiles`, `todos`, and `riff_events` tables |
| `rig.list` / `list_where` / `get` / `remove` | Allow-listed table access |
| `rig.insert_todo` / `insert_profile` / `patch_todo_done` | Typed writes |
| `rig.track_riff` / `count_riff` | Riff registry install telemetry |
| `rig.require_user` / `user_view` | Auth adapter over `request.who` |
| `rig.resolve_object` | Safe object-storage paths |
| `rig.health` / `auth_health` | Gateway health payloads |

## Layout

```
rig/
  riff              # manifest
  lib.vaab          # helpers
  studio/           # Supabase Studio–shaped dashboard (Vite + React)
  examples/server/  # full mount demo + Studio static serve
```

## Not this repo

`/workspace/riff` was an earlier Docker wrap of upstream Supabase. That collides
with the Vaab package noun. **rig** is the Vaab-native clone; keep Docker self-host
as an optional ops path, not the riff name.

## License

MIT — same as Vaab.
