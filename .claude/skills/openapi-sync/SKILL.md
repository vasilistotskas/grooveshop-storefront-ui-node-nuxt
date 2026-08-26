---
name: openapi-sync
description: Fetch the Django OpenAPI schema and regenerate the TypeScript types, Zod schemas, and derived YAML
disable-model-invocation: true
allowed-tools: Read, Edit, Bash, Grep, Glob
---

# OpenAPI Sync

Pull the OpenAPI schema from Django and regenerate everything derived from it.
Run from the storefront root.

If the Django serializers themselves changed, run the cross-service
`/schema-sync` from the monorepo root instead — it regenerates Django's
`schema.yml` first.

## Prerequisites

- **A LOCAL Django backend running** — see the warning below.
- `DJANGO_API_TOKEN` set, or a `.auth-token` file present.

## Never regenerate from production

`scripts/fetch-schema.mjs` reads **`NUXT_DJANGO_URL`** (default
`http://localhost:8000`). Note the name: it is *not* `NUXT_API_BASE_URL`.

Production's `/api/v1/schema` is a **subset** of local (255 components vs 271),
missing dev-only components the frontend uses — `Country`, `BlogAuthor`,
`Paginated*List`. Regenerating from prod silently deletes them.

## Workflow

### 1. Fetch the schema

```bash
pnpm generate:schema
```

Writes `openapi/schema.json` and `openapi/schema.yml`. On failure: is local
Django up, is `NUXT_DJANGO_URL` correct, is the token present?

### 2. Generate types and Zod schemas

```bash
pnpm openapi-ts
```

`@hey-api/openapi-ts` (see `openapi-ts.config.ts`) reads `schema.json` and
writes `shared/openapi/types.gen.ts` and `shared/openapi/zod.gen.ts`, then
post-processes with ESLint.

### 3. Sync the derived YAML — required, not optional

```bash
pnpm sync:schema
```

`openapi/schema.yml` and the root `schema.yml` are **derived** from
`openapi/schema.json` by `scripts/sync-schema-yml.mjs`. CI's *OpenAPI Schema
Freshness* job regenerates them and fails on any diff, so skipping this breaks
the build.

### 4. Type check

```bash
pnpm typecheck
```

`nuxt typecheck`, not `vue-tsc --noEmit` — the Nuxt-aware pass catches template
errors vue-tsc misses, and it is what surfaces consumers of a field whose type
changed.

### 5. Report

```bash
git diff --stat shared/openapi/ openapi/ schema.yml
```

## Field removals are the dangerous direction

Adding a field is safe. **Removing** one is a silent breaking change: the
committed Zod still marks it `required`, so `parseDataAs` rejects the correctly
absent field with a 422 "Data parsing failed" — and only on the one flow that
returns that nested object. Same class: **type** mismatches (int vs
uuid-string) and **nullable** mismatches (Django `null` vs Nuxt non-null). For
a response, Nuxt stricter than Django is the 422 risk; more lenient is safe.

## Commit together

`openapi/schema.json`, `openapi/schema.yml`, root `schema.yml`, and
`shared/openapi/*` are one atomic change.

## Conventions

- Generated files are never edited by hand.
- Never hand-write or hand-extend a Zod schema the generator can produce. Fix
  the shape at the Django source, then regenerate.
- Generated Zod exports are `z`-prefixed (`zGetLoyaltySummaryResponse`).
  Hand-written schemas in `shared/schemas/` are `Zod`-prefixed and may wrap the
  generated ones.
