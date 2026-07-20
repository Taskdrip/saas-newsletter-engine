# listmonk

Self-hosted newsletter and mailing list manager. Powered by [listmonk](https://listmonk.app) (open-source Go app) — deployed on Railway via Docker with PostgreSQL.

## Run & Operate

### Local development (Docker)
```sh
cp .env.sample .env         # fill in LISTMONK_ADMIN_PASSWORD
docker compose up -d        # starts Postgres + listmonk
open http://localhost:9000  # admin UI
```
First run: `LISTMONK_INSTALL=true` is set in docker-compose.yml — creates DB tables automatically.
After first run: set `LISTMONK_INSTALL: "false"` in docker-compose.yml before restarting.

### Railway deployment
See **DEPLOYMENT.md** for the complete step-by-step Railway setup guide.

## Stack

- **App**: [listmonk v6.2.0](https://github.com/knadh/listmonk) — Go binary, single container
- **DB**: PostgreSQL 16 (Railway addon or local Docker)
- **Build**: Dockerfile + custom entrypoint (docker-entrypoint.sh)
- **Deploy target**: Railway (railway.toml configured)

## Where things live

| File | Purpose |
|---|---|
| `Dockerfile` | Builds listmonk Docker image from official base |
| `docker-entrypoint.sh` | Generates config.toml from env vars, runs install/upgrade |
| `railway.toml` | Railway build + deploy settings |
| `docker-compose.yml` | Local dev stack (Postgres + listmonk) |
| `.env.sample` | All environment variables with descriptions |
| `DEPLOYMENT.md` | Complete Railway deployment + email setup guide |

## Key environment variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres URL — auto-injected by Railway addon |
| `DB_SSLMODE` | `require` on Railway, `disable` for local Docker |
| `LISTMONK_ADMIN_USER` | Admin UI login username |
| `LISTMONK_ADMIN_PASSWORD` | Admin UI login password — **must be set** |
| `LISTMONK_INSTALL` | Set `true` on first deploy only, then `false` |
| `LISTMONK_UPGRADE` | Set `true` to auto-run DB migrations on boot |

## Architecture decisions

- **Official Docker image**: Using `listmonk/listmonk:v6.2.0` as base — gets the pre-built binary + static files without needing Go in the build environment.
- **Entrypoint script generates config.toml**: listmonk uses a TOML config file, not pure env vars. The entrypoint parses `DATABASE_URL` (Railway's format) and writes config.toml at runtime.
- **`LISTMONK_INSTALL` flag**: First-boot DB initialisation is controlled by this env var to avoid accidental re-init on restarts.
- **`LISTMONK_UPGRADE=true` always on**: Running `--upgrade` on every boot is safe (no-op if already current) and ensures schema stays in sync after version bumps.

## Gotchas

- Set `LISTMONK_INSTALL=false` after the first deploy — leaving it `true` will attempt re-init on every restart (won't wipe data, but generates noisy warnings).
- Railway's PostgreSQL requires `DB_SSLMODE=require`. Local Docker Compose uses `disable`.
- listmonk's SMTP settings (email sending) are configured in the admin UI after first login — not via env vars.
- To upgrade listmonk: bump the version in `FROM listmonk/listmonk:vX.Y.Z` in Dockerfile, commit and push.

## User preferences

_Populate as you build._
