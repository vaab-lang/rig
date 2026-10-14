# rig

Official **rig** riff for [Vaab](https://github.com/vaab-lang/vaab): a Supabase-shaped
backend you mount from a `serve` block.

In the Vaab naming world:

| Name | Role |
|------|------|
| **riff** | The package kind (`riff install …`) |
| **tape** | Static file helpers for `reply file` |
| **supabase** | Thin *client* to hosted Supabase/PostgREST |
| **rig** | Your own backline — data API, auth adapter, object paths, Studio |

A musician rolls in a **rig** (amp, pedals, tape deck). Apps `need rig` the same
way they `need tape`.

## Install

```bash
riff install rig
```

Dedicated repo: [github.com/vaab-lang/rig](https://github.com/vaab-lang/rig)  
Catalog: [riff.vaab.dev](https://riff.vaab.dev) (install counts stored via rig itself)

Requires **Vaab ≥ 0.1.4** (linked-riff Db / NodeId fixes). Studio Basic auth needs a
Vaab build that exposes `request.headers` and `basic_auth_ok` (current `main`).

## What it gives you

| Supabase piece | Rig |
|----------------|-----|
| Postgres + PostgREST | `Db` + `rig.list` / `get` / `insert_*` / `remove` over allow-listed tables |
| Auth (GoTrue) | `rig.require_user(request.who)` on Vaab’s builtin bearer auth |
| Storage | `rig.resolve_object(root, path)` for `/storage/v1/object/...` |
| Edge Functions | Your own `route` blocks in Vaab |
| Studio | Precompiled [`studio/dist`](studio/dist) — mount like tape, with username/password |

## Mounting in `serve`

Mount the pieces you need inside your `serve` block and choose each mount point with `at` (or omit `at` to use the default prefix):

```vaab
need rig

serve on port 54321 {
    mount rig_auth at "/auth/v1"
    mount rig_api at "/rest/v1"
    mount rig_storage at "/storage/v1"
    mount rig_studio at "/studio"
}
```

| Mount | Default mount point | Routes (relative to mount point) |
|-------|---------------------|----------------------------------|
| `mount rig_auth` | `"/auth/v1"` | `/health`, `/user` |
| `mount rig_api` | `"/rest/v1"` | `/`, `/{table}`, `/{table}/{id}` for every table in Studio (plus `/health`) |
| `mount rig_storage` | `"/storage/v1"` | `/object/{*filepath}` |
| `mount rig_studio` | `"/studio"` | `/`, `/{*filepath}` (plus `/studio-api/*`) |
| `mount rig` | `""` | All of the above (`rig_auth` + `rig_api` + `rig_storage` + `rig_studio`) |

Precompiled assets ship in the riff (`studio/dist`, listed in `studio/files` so
`riff install` pulls them). Studio auto-detects `studio/dist`, `vendor/rig/studio/dist`,
`../../studio/dist`, or `~/.vaab/riffs/rig/studio/dist` (override with `RIG_STUDIO_ROOT`,
`RIG_STUDIO_USER`, `RIG_STUDIO_PASS`).

## Example gateway

See [`examples/server`](examples/server) — Supabase-shaped `/auth`, `/rest`,
`/storage` on port `54321`, Studio at `/studio/`.

```bash
cd examples/server
/path/to/vaab gather
RIG_DATABASE_URL=sqlite:../../rig.db AUTH_SECRET=dev \
  /path/to/vaab serve main.vaab
```

Open **http://127.0.0.1:54321/studio/** (user `admin` / password `secret`).

```bash
curl -s localhost:54321/health
curl -su admin:secret localhost:54321/studio-api/tables
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
| `rig.ensure_schema(db)` | Create `profiles`, `riff_events`, and Studio metadata tables |
| `rig.studio_table_names(db)` | List table names registered in Studio |
| `rig.list` / `list_where` / `get` / `remove` | Read and delete rows across Studio tables |
| `rig.insert_row` / `patch_row` / `insert_profile` | Insert and update rows across Studio tables |
| `rig.track_riff` / `count_riff` | Riff registry install telemetry |
| `rig.require_user` / `user_view` | Auth adapter over `request.who` |
| `rig.resolve_object` | Safe object-storage paths |
| `Studio.new` / `mount_studio` / `mount_studio_at` | Configure Studio root + credentials |
| `authorize_studio` / `resolve_studio` | Basic-auth gate + tape-like path resolve |
| `rig.health` / `auth_health` | Gateway health payloads |

## Layout

```
rig/
  riff              # manifest
  lib.vaab          # helpers + Studio mount
  studio/dist/      # precompiled Studio SPA (committed)
  studio/files      # asset list for `riff install`
  examples/server/  # full mount demo
```

## License

MIT — same as Vaab.
