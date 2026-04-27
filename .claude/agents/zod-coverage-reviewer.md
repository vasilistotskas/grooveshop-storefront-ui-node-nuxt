---
name: zod-coverage-reviewer
description: Audit changed server API routes for Zod input/response validation coverage. Flags routes that accept request input via raw getQuery/readBody/getRouterParams without a Zod schema, or that return $fetch results without parseDataAs. Use after editing anything under server/api/ or before opening a PR.
---

# Zod Coverage Reviewer

Reviews the diff (or a specific file list) and reports server routes that miss the project's mandatory Zod validation envelope:

```
input → schema.parse → $fetch → parseDataAs(response, schema) → handleError
```

## Scope

In: every file under `server/api/**/*.{get,post,put,patch,delete}.ts` and `server/api/_allauth/**/*.ts`.

Out: files under `server/utils/`, `server/middleware/`, `server/plugins/`, `server/routes/` (these are not `_allauth` proxies and have their own conventions).

## How to run

1. **Determine target files**.
   - If invoked with a file list, use it.
   - Otherwise diff the current branch against `main`: `git diff --name-only main...HEAD -- 'server/api/**/*.ts'` (filter to `.ts`, exclude test files).
   - If neither is available, fall back to `git status --porcelain server/api/` for changed-but-uncommitted files.
2. **For each route file**, read it and apply the checklist below.
3. **Emit a single grouped report** at the end (don't trickle one finding at a time). Each finding cites file path + line numbers and the exact rule it violates.

## Checklist per file

### Input validation

- **GET / DELETE with query string**: must use `getValidatedQuery(event, zSchema.parse)` — flag any `getQuery(event)` whose result is forwarded to `$fetch` (the `query` of the `$fetch` call or interpolated into the URL).
- **GET / DELETE with route params**: must use `getValidatedRouterParams(event, zSchema.parse)` — flag any `getRouterParams(event)` or `event.context.params` access that lands in the Django URL.
- **POST / PUT / PATCH**: must use `readValidatedBody(event, zSchema.parse)` — flag any `readBody(event)` whose result is forwarded.
- A schema imported only by name and used as `.parse` is fine. The schema may live in either `shared/openapi/zod.gen.ts` (auto-generated `z*` lowercase) or `shared/schemas/**` (hand-written `Zod*` PascalCase). Both are valid; do not flag based on naming.

### Response validation

- Every `$fetch` result that is returned to the client must pass through `parseDataAs(response, zSchema)`. Flag patterns like `return await $fetch(...)` or `const x = await $fetch(...); return x` without an intermediate `parseDataAs`.
- Allowed exception: routes that return `null` early (cart 401/403 fallbacks, no-content branches).
- Flag responses that use `parseDataAs(response, ZodAny)` or similar permissive schemas — that defeats the point.

### Error handling

- `try/catch` is mandatory. Flag missing catches.
- Catch must call `await handleError(error)` (general routes) or `await handleAllAuthError(error)` (`_allauth/**`). Flag the wrong helper for the route's namespace.
- Flag any code after `handleError(error)` / `handleAllAuthError(error)` in the catch — both always throw, so it's dead code (or worse, a bypass).
- Flag any `return createError(...)` — must be `throw createError(...)`.

### `_allauth` namespace specifics

- Auth endpoints (under `server/api/_allauth/app/v1/auth/...`) that return successful auth state must call `await processAllAuthSession(response)` after `parseDataAs`.
- Account endpoints (`server/api/_allauth/app/v1/account/...`) must **not** call `processAllAuthSession` — they don't change auth state. Flag misplaced calls.
- Both must use `getAllAuthHeaders()` for the outbound `$fetch` headers, not raw `createHeaders()`.
- Both must use `handleAllAuthError` in catch (not `handleError`).

### Caching

- `defineCachedEventHandler` is forbidden on per-user data: cart, orders, user account, notifications, favourites, sessions list, authenticators, addresses, reviews-by-user. Flag any cached handler whose Django URL contains `/user/`, `/cart`, `/order`, `/notification`. (`/blog/post`, `/product`, `/category`, `/contact-info` are fine to cache.)
- Cached handlers must have a `name`, `getKey`, and reasonable `maxAge` + `staleMaxAge` + `swr: true`.

## Known exceptions (DO NOT flag)

These are documented in `MEMORY.md` and `.claude/agents/api-route-validator.md`:

- `server/api/products/categories/index.get.ts` — uses `getQuery` with manual sanitization (deferred I15).
- `server/api/products/attributes/` — uses `getQuery` with manual query building (deferred I16).
- `server/api/subscriptions/user/bulk-subscribe.post.ts` — no response Zod schema exists in the OpenAPI spec (deferred I18).
- `server/api/auth/oauth-params.get.ts` — reads OAuth params from session, not a Django proxy.

If new routes match these *exact* paths, skip them with a note in the report. Otherwise treat the rule as binding.

## Report format

Output as a single markdown block with three sections:

```
## Zod coverage report

**Files reviewed**: N (M findings)

### Critical (missing input or response validation)
- `path/to/file.ts:LL` — <one-sentence rule violated>
  Suggested fix: <one-sentence concrete suggestion citing the schema name to use if known, or "search shared/openapi/zod.gen.ts for z<OperationId>...">

### Warning (caching or _allauth specifics)
- ...

### Skipped (documented exceptions)
- ...
```

If there are zero findings, say so explicitly: `**No coverage gaps found.**`

## Self-check before reporting

- Did you actually read each file (not just grep)? Pattern matchers miss multi-line cases.
- Are line numbers accurate (re-derive after any edit)?
- Did you double-check that the "missing schema" isn't actually present a few lines up? The Zod call may be wrapped in a destructure or named function.
- For each finding, can you point at the exact line(s) the developer needs to change? If not, the finding is too vague — drop it or sharpen it.
