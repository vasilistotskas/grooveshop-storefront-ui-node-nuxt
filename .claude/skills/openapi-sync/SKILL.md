---
name: openapi-sync
description: Fetch Django OpenAPI schema and regenerate TypeScript types and Zod schemas
disable-model-invocation: true
---

# OpenAPI Sync

Synchronize the OpenAPI schema from the Django backend and regenerate TypeScript types and Zod validation schemas.

## Prerequisites

- Django backend must be running at `NUXT_API_BASE_URL` (default: `http://localhost:8000/api/v1`)
- Either `DJANGO_API_TOKEN` env var or `.auth-token` file must exist for authentication

## Workflow

Execute these steps in order:

### Step 1: Fetch the OpenAPI schema from Django

```bash
pnpm generate:schema
```

This runs `scripts/fetch-schema.mjs` which downloads:
- `openapi/schema.json`
- `openapi/schema.yml`

If this fails, check:
- Is the Django backend running?
- Is `DJANGO_API_TOKEN` set or `.auth-token` file present?
- Is `NUXT_API_BASE_URL` configured in `.env`?

### Step 2: Generate TypeScript types and Zod schemas

```bash
pnpm openapi-ts
```

This uses `@hey-api/openapi-ts` (configured in `openapi-ts.config.ts`) to generate:
- `shared/openapi/types.gen.ts` — TypeScript type definitions
- `shared/openapi/zod.gen.ts` — Zod validation schemas

Output is post-processed with ESLint for consistent formatting.

### Step 3: Verify types are valid

```bash
npx vue-tsc --noEmit
```

Check for any type errors introduced by the schema changes.

### Step 4: Report changes

Run `git diff --stat shared/openapi/` to show what changed in the generated files.

If there are breaking changes (removed types, renamed fields), flag them — they may require updates to:
- `shared/schemas/` (hand-written Zod schemas that reference generated types)
- `server/api/` routes (that use `parseDataAs` with generated schemas)
- `app/` components and composables (that use generated types)

## Notes

- Generated files (`types.gen.ts`, `zod.gen.ts`) should NEVER be edited manually
- The `openapi-ts.config.ts` configures: input from `schema.json`, output to `shared/openapi/`, plugins for TypeScript and Zod with date offset handling
- Zod schemas from `shared/openapi/zod.gen.ts` are prefixed with `z` (e.g., `zGetLoyaltySummaryResponse`)
- Hand-written schemas in `shared/schemas/` may wrap or extend generated schemas
