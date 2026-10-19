---
name: api-route-validator
description: >
  Validate Nitro server routes under server/api/ against the project's
  four-step pattern: Zod input validation, useBackendFetch(event) to Django,
  parseDataAs on the response, and handleError(event, error) in the catch.
  Use after adding or editing any file under server/api/ or server/routes/.
tools: Read, Grep, Glob
---
# API Route Validator

Validate that server API routes in `server/api/` follow the established project conventions and patterns. `.claude/rules/server-routes.md` and `.claude/rules/multi-tenant.md` are the source of truth; where this checklist and they disagree, they win.

## Required Pattern

Every server API route must follow this structure (modelled on `server/api/blog/comments/index.post.ts`):

```typescript
import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    // 1. Validate input with Zod (the schema itself, not `.parse`)
    const body = await readValidatedBody(event, zSchema)
    // OR for GET: await getValidatedQuery(event, zSchema)
    // OR for route params: await parseRouterParams(event, zParamsSchema)

    // 2. Fetch from Django (there is no global `$fetch` on the server)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/endpoint`, {
      method: 'POST',
      body,
    })

    // 3. Validate and return response
    return await parseDataAs(response, zResponseSchema)
  }
  catch (error) {
    // 4. Error handling (always throws)
    handleError(event, error)
  }
})
```

## Checklist

### Input Validation
- [ ] GET routes use `getValidatedQuery(event, zSchema)`
- [ ] POST/PUT/PATCH routes use `readValidatedBody(event, zSchema)`
- [ ] Route params use `parseRouterParams(event, zSchema)`
- [ ] Zod schemas come from `shared/schemas/` or `shared/openapi/zod.gen.ts`
- [ ] No raw `getQuery()` / `readBody()` result forwarded to Django (except the known exceptions below). `getQuery` inside a cached route's `getKey` is correct.
- [ ] h3 and Nitro helpers are imported explicitly from `nuxt/server` (or `nitropack/runtime`); `server/utils` and `shared` exports stay auto-imported

### Django Proxy
- [ ] Uses `useBackendFetch(event)` with the `config.apiBaseUrl` prefix (`config.djangoUrl` for `_allauth`)
- [ ] HTTP method matches the file suffix (`.get.ts` = GET, `.post.ts` = POST, etc.)
- [ ] Auth-protected routes include proper headers via `getAllAuthHeaders(event)` or `requireAllAuthAccessToken(event)`
- [ ] Cart routes use `useCartSession(event)` for `X-Cart-Id` header

### Response Validation
- [ ] Response validated with `parseDataAs(response, zodSchema)`
- [ ] Zod schema matches the expected Django API response structure

### Error Handling
- [ ] `handleError(event, error)` in catch block (for general routes)
- [ ] `await handleAllAuthError(event, error)` in catch block (for auth routes under `_allauth/`)
- [ ] A route whose 4xx body the client must read may `return forwardUpstreamClientError(event, error)` (general) or `return await forwardAllAuthFlow(event, error)` (`_allauth/`)
- [ ] NO code after `handleError()` / `handleAllAuthError()` (they always throw)
- [ ] `createError()` is always `throw`n, never `return`ed

### Caching (for cacheable GET routes)
- [ ] Uses `defineCachedRoute()` (`server/utils/cachedRoute.ts`)
- [ ] Has `name` for cache identification
- [ ] Has `maxAge` and `staleMaxAge` with `swr: true`
- [ ] `getKey` returns `tenantCacheKey(event, …)` and includes every varying query param — a key without it serves one store's data to another
- [ ] NOT used on per-user data (cart, orders, user account, notifications)

### Auth Routes (`server/api/_allauth/`)
- [ ] Uses `getAllAuthHeaders(event)` for forwarding session/access tokens
- [ ] Calls `processAllAuthSession(event, response)` wherever the response can carry new session/access tokens (auth endpoints, and account endpoints such as password change)
- [ ] Uses `handleAllAuthError()` (or `forwardAllAuthFlow()`) instead of `handleError()`

## Known Exceptions
- `server/api/products/categories/index.get.ts` — Uses `getQuery` without Zod validation (manually sanitized)
- `server/api/products/attributes/` — Uses `getQuery` without Zod validation (manually built query)
- `server/api/auth/oauth-params.get.ts` — Reads directly from session, not a Django proxy
- `server/routes/rss.xml.get.ts` — Static route, not an API proxy
- `server/api/__sitemap__/urls.ts` — Sitemap utility, custom pattern
