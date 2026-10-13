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
| Studio | Not in v0.1 |

## Same shape as tape

`tape` does not open the HTTP server — your `serve` block does, then calls
`tape.resolve` before `reply file`.

`rig` does not open the database — your app calls `Db.connect`, then
`rig.ensure_schema` / `rig.insert_*` / … inside routes. Auth stays
`request.who`; rig only adapts it.

## Example mount

See the full gateway demo in [`examples/server`](examples/server)
(Supabase-shaped `/auth`, `/rest`, `/storage` routes on port `54321`).

```bash
cd examples/server
/path/to/vaab gather
RIG_DATABASE_URL=sqlite:../../rig.db AUTH_SECRET=dev \
  /path/to/vaab serve main.vaab
```

Then:

```bash
curl -s localhost:54321/health
curl -s localhost:54321/auth/v1/health
curl -s localhost:54321/rest/v1/todos \
  -H "Authorization: Bearer <id>|<email>|<hmac>"
```

## API

| Call | Purpose |
|------|---------|
| `rig.connect()` / `connect_with` | `RIG_DATABASE_URL` + optional `RIG_STORAGE_ROOT` |
| `Db.connect(client.db_url)` | Open the DB in the **app** (same split as `reply file` for tape) |
| `rig.ensure_schema(db)` | Create demo `profiles` + `todos` tables |
| `rig.list` / `list_where` / `get` / `remove` | Allow-listed table access |
| `rig.insert_todo` / `insert_profile` / `patch_todo_done` | Typed writes |
| `rig.require_user` / `user_view` | Auth adapter over `request.who` |
| `rig.resolve_object` | Safe object-storage paths |
| `rig.health` / `auth_health` | Gateway health payloads |

## Layout

```
rig/
  riff              # manifest
  lib.vaab          # helpers
  examples/server/  # full mount demo
```

## Vaab 0.1.3 boundaries

A few calls fault today if done *inside* a linked riff (VM bugs, not rig design):
`Db.connect` and some Client field reads. The demo keeps those in the app/cast
layer — the same split tape uses for `reply file`.

## Not this repo

`/workspace/riff` was an earlier Docker wrap of upstream Supabase. That collides
with the Vaab package noun. **rig** is the Vaab-native clone; keep Docker self-host
as an optional ops path, not the riff name.

## License

MIT — same as Vaab.
