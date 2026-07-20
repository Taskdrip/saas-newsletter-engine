---
name: Orval + Zod format annotation issue
description: format:email and format:uri in OpenAPI spec cause broken Zod codegen with current Orval version.
---

# Orval Zod format: email/uri Issue

**Rule**: Never add `format: email` or `format: uri` to string fields in `lib/api-spec/openapi.yaml`.

**Why**: Orval generates `zod.email()` and `zod.url()` for these formats, but the project uses Zod v3 where those are `z.string().email()` / `z.string().url()`. Causes 14+ TypeScript compilation errors in `lib/api-zod`.

**How to apply**: Keep all string fields as plain `type: string` regardless of semantic meaning. The validation can be done at the application layer if needed.

**Also fixed**: `format: date-time` was also stripped since it caused similar issues.
