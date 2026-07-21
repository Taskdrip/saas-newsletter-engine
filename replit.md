# listmonk + CampaignForge

Self-hosted newsletter platform using [listmonk](https://listmonk.app) v6.2.0 as the email-sending engine, with a CampaignForge SaaS frontend that integrates directly with listmonk's API for real bulk email delivery.

## Running services

| Service | Port | URL |
|---|---|---|
| **listmonk** (preview, admin UI) | 9000 → 80 | `/` in preview pane |
| **CampaignForge API** | 8080 | `/api` |
| **CampaignForge UI** | 25176 | `/campaignforge` (not started by default) |

## Start everything

```sh
# listmonk (already the run button target)
bash listmonk-app/start.sh

# CampaignForge API (needs Clerk secrets — see below)
pnpm --filter @workspace/api-server run dev

# CampaignForge UI
pnpm --filter @workspace/campaign-forge run dev
```

## listmonk admin login

- **URL**: open preview pane root → `/admin`
- **Username**: `admin`
- **Password**: `listmonk_admin_2024`  ← change this in production!

## listmonk integration in CampaignForge

When a campaign is sent from CampaignForge, the API server:
1. Loads the campaign's subscriber lists from the CampaignForge DB
2. Creates a matching list in listmonk (upserts — safe to call multiple times)
3. Bulk-syncs all active subscribers into that listmonk list
4. Creates a campaign in listmonk with the template HTML
5. Starts the campaign → listmonk handles actual SMTP delivery
6. Stores the listmonk campaign/list IDs in the campaigns table for stats sync

### Key files

| File | Purpose |
|---|---|
| `artifacts/api-server/src/lib/listmonk.ts` | listmonk API client (lists, subscribers, campaigns, stats) |
| `artifacts/api-server/src/routes/campaigns.ts` | Campaign send route — calls listmonk for real delivery |
| `listmonk-app/start.sh` | Generates config.toml from env vars, starts listmonk binary |
| `listmonk-app/listmonk` | Pre-built listmonk v6.2.0 binary (linux/amd64) |

### listmonk env vars (for API server)

| Variable | Default | Notes |
|---|---|---|
| `LISTMONK_URL` | `http://localhost:9000` | Change for Railway (e.g. `https://your-listmonk.railway.app`) |
| `LISTMONK_USER` | `admin` | listmonk admin username |
| `LISTMONK_PASSWORD` | `listmonk_admin_2024` | listmonk admin password |
| `LISTMONK_DEFAULT_FROM` | `newsletter@example.com` | Default from-email if campaign doesn't specify one |

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- **Email engine**: listmonk v6.2.0 (Go binary, self-hosted, unlimited sending)
- **API**: Express 5 + Clerk auth
- **DB**: PostgreSQL + Drizzle ORM (shared between CampaignForge and listmonk)
- **Frontend**: React + Vite + Wouter (CampaignForge)

## Required secrets for CampaignForge

| Secret | Where to get it |
|---|---|
| `CLERK_SECRET_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) |
| `CLERK_PUBLISHABLE_KEY` | Same |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same |
| `DATABASE_URL` | Auto-set in Replit; set manually on Railway |

listmonk itself requires **no Clerk keys** — it has its own user system.

## Where things live

- `listmonk-app/` — listmonk binary + generated config.toml + start script
- `artifacts/api-server/src/` — Express API with listmonk integration
- `artifacts/campaign-forge/src/` — React frontend
- `lib/db/src/schema/` — Drizzle schema (campaigns table has `listmonk_campaign_id`, `listmonk_list_id`)
- `Dockerfile` + `railway.toml` + `DEPLOYMENT.md` — Railway deployment config

## Railway deployment

See **DEPLOYMENT.md** for full Railway setup. Key points:
- Two services: one for listmonk (uses Dockerfile), one for the CampaignForge API
- Set `LISTMONK_URL` in the API service to point at the listmonk service URL

## Gotchas

- `[[ports]] localPort=9000 externalPort=80` in `.replit` routes the preview to listmonk. This entry gets stripped whenever an artifact workflow is restarted — reapply with `.replit.new` + `verifyAndReplaceDotReplit` **after** all workflow restarts.
- listmonk and CampaignForge share the same PostgreSQL database (`heliumdb`). Schema changes that affect listmonk's own tables require restarting listmonk to clear PostgreSQL's cached query plans.
- `LISTMONK_INSTALL=true` only on first deploy — leave it false thereafter.
- CampaignForge API server requires Clerk secrets to handle auth. listmonk does not.

## User preferences

_Populate as you build._
