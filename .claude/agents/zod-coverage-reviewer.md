---
name: zod-coverage-reviewer
description: Audit changed server API routes for Zod input/response validation coverage. Flags routes that accept request input via raw getQuery/readBody/getRouterParams without a Zod schema, or that return useBackendFetch results without parseDataAs. Use after editing anything under server/api/ or before opening a PR.
tools: Read, Grep, Glob, Bash
---

# Zod Coverage Reviewer

Reviews the diff (or a specific file list) and reports server routes that miss the project's mandatory Zod validation envelope:

```
input (getValidatedQuery / readValidatedBody / parseRouterParams) → useBackendFetch(event) → parseDataAs(response, schema) → handleError(event, error)
```

`.claude/rules/server-routes.md` and `.claude/rules/multi-tenant.md` are the source of truth; where this checklist and they disagree, they win.

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

- **GET / DELETE with query string**: must use `getValidatedQuery(event, zSchema)` (from `nuxt/server`, given the schema itself) — flag any `getQuery(event)` whose result is forwarded to Django (the `query` of the `useBackendFetch(event)(…)` call or interpolated into the URL). `getQuery` inside a cached route's `getKey` is correct: that callback gets h3's event.
- **Route params**: must use `parseRouterParams(event, zSchema)` (`server/utils/routerParams.ts`) — flag any `getRouterParam(s)(event)` or `event.context.params` access that lands in the Django URL.
- **POST / PUT / PATCH**: must use `readValidatedBody(event, zSchema)` — flag any `readBody(event)` whose result is forwarded.
- The schema may live in either `shared/openapi/zod.gen.ts` (auto-generated `z*` lowercase) or `shared/schemas/**` (hand-written `Zod*` PascalCase). Both are valid; do not flag based on naming.

### Imports

- h3 and Nitro helpers are imported explicitly, from `nuxt/server` (or `nitropack/runtime` for Nitro-only APIs); `server/utils` and `shared` exports stay auto-imported. Flag a helper used without an import (`test/unit/source-rules/server-imports-are-explicit.spec.ts` fails on it too).

### Django call

- Every Django call goes through `useBackendFetch(event)`. Flag a global `$fetch` or an `ofetch` call to Django: it drops the store's `X-Forwarded-Host`, `X-Language` and the visitor's identity.
- The URL starts with `config.apiBaseUrl` (`config.djangoUrl` under `_allauth/**`).
- The Django call's method matches the route's file suffix (`.get.ts` → GET, `.post.ts` → POST, …). The one deliberate mismatch is `server/api/websocket/user/ticket.get.ts`, which mints the ticket with Django's `POST /websocket/ticket`.
- A route that needs the signed-in user takes the token from `requireAllAuthAccessToken(event)` (401 without one) and forwards it as the `Authorization` bearer, directly or through `createHeaders(event, …)`.
- A route that acts on the visitor's session cart goes through `server/utils/cartSession.ts` (`useCartSession(event)` for the `X-Cart-Id` header and the response's cart id). Flag a hand-built `X-Cart-Id`.

### Response validation

- Every `useBackendFetch(event)(…)` result that is returned to the client must pass through `parseDataAs(response, zSchema)`. Flag patterns like `return await useBackendFetch(event)(...)` or `const x = await useBackendFetch(event)(...); return x` without an intermediate `parseDataAs`.
- Allowed exception: routes that return `null` early (cart 401/403 fallbacks, no-content branches).
- Flag responses that use `parseDataAs(response, ZodAny)` or similar permissive schemas — that defeats the point.

### Error handling

- `try/catch` is mandatory. Flag missing catches.
- Catch must call `handleError(event, error)` (general routes) or `await handleAllAuthError(event, error)` (`_allauth/**`). Flag the wrong helper for the route's namespace. A route whose 4xx body the client must read may instead `return forwardUpstreamClientError(event, error)` (general) or `return await forwardAllAuthFlow(event, error)` (`_allauth/**`); both fall through to `handleError` for everything else, so do not flag them.
- Flag any code after `handleError(event, error)` / `handleAllAuthError(event, error)` in the catch — both always throw, so it's dead code (or worse, a bypass).
- Flag any `return createError(...)` — must be `throw createError(...)`.

### `_allauth` namespace specifics

- Call `processAllAuthSession(event, response)` wherever the response can carry new session/access tokens (auth endpoints, and account endpoints such as password change).
- Both must use `getAllAuthHeaders(event)` for the outbound headers, not raw `createHeaders(event, …)`.
- Both must use `handleAllAuthError` (or `forwardAllAuthFlow`) in catch, not `handleError`.

### Caching

- Cached GETs use `defineCachedRoute` (`server/utils/cachedRoute.ts`) with `getKey` built on `tenantCacheKey(event, …)`; a key without it serves one tenant's data to another. Flag a bare `defineCachedEventHandler` in `server/api/` and any `getKey` that does not return `tenantCacheKey(event, …)`.
- Caching is forbidden on per-user data: cart, orders, user account, notifications, favourites, sessions list, authenticators, addresses, reviews-by-user. Flag any cached route whose Django URL contains `/user/`, `/cart`, `/order`, `/notification`, or whose key is built on per-user data. (`/blog/post`, `/product`, `/category`, `/contact-info` are fine to cache.)
- Cached routes must have a `name`, `getKey`, and reasonable `maxAge` + `staleMaxAge` + `swr: true`.

## Known exceptions (DO NOT flag)

These are the known exceptions:

- `server/api/auth/oauth-params.get.ts` — reads OAuth params from session, not a Django proxy.
- `server/api/__sitemap__/urls.ts` — the `@nuxtjs/sitemap` source (`defineSitemapEventHandler`); it fetches through `createCachedFetcher` (`backendFetchFor` inside a cached function), not the per-request envelope.
- `server/routes/rss.xml.get.ts` — out of scope (`server/routes/`): the RSS feed, built in cached functions with `backendFetchFor` + `parseDataAs`.

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
