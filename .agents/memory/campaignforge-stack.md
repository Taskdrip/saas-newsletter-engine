---
name: CampaignForge Stack Decisions
description: Architecture decisions made during CampaignForge build — auth, DB, codegen, routing.
---

# CampaignForge Stack

**Auth**: Clerk via Replit-managed tenant. Secrets: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`. Proxy middleware mounted at `/api/__clerk`. Frontend uses `publishableKeyFromHost` + `proxyUrl` from `VITE_CLERK_PROXY_URL` (only needed in prod).

**DB**: PostgreSQL + Drizzle ORM. Schema in `lib/db/src/schema/` (split into domain files). Push with `pnpm --filter @workspace/db run push`. Seed with `npx tsx artifacts/api-server/src/seed.ts`.

**Codegen**: OpenAPI-first. Spec at `lib/api-spec/openapi.yaml`. Run `pnpm --filter @workspace/api-spec run codegen` after spec changes. Generates React Query hooks into `lib/api-client-react` and Zod schemas into `lib/api-zod`.

**Frontend**: React + Vite at `artifacts/campaign-forge`. Base path from `import.meta.env.BASE_URL`. Routes via Wouter. WorkspaceContext auto-selects first workspace. All API calls via generated hooks from `@workspace/api-client-react`.

**Backend**: Express at `artifacts/api-server`. Clerk middleware from `@clerk/express`. Routes in `artifacts/api-server/src/routes/`.

**Why**: Go was not available on Replit; TypeScript Express was chosen instead.

**How to apply**: Follow this pattern for any new feature — update OpenAPI spec first, run codegen, add DB schema + push, add backend route, add frontend page.
