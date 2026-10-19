---
name: gen-server-route
description: Scaffold a new server API route under server/api/ following the project's strict 4-step pattern (Zod input → `useBackendFetch(event)` to Django → parseDataAs response → handleError(event, error) catch). Use when adding a new endpoint that proxies the Django backend. Pick the right variant — cached GET, mutating POST/PUT/PATCH, cart-aware, allauth-protected, or dynamic-param.
disable-model-invocation: true
---

# Generate Server Route

Creates a new server route file under `server/api/...` (or `server/api/_allauth/app/v1/...` for auth) following the conventions the `zod-coverage-reviewer` agent checks. Import h3 and Nitro helpers explicitly, from `nuxt/server` (routes) or `nitropack/runtime` (Nitro-only APIs), as `.claude/rules/server-routes.md` describes. `server/utils` and `shared` exports stay auto-imported: `useBackendFetch`, `defineCachedRoute`, `tenantCacheKey`, `parseRouterParams`, `parseDataAs`, `handleError`, `handleAllAuthError`, `forwardAllAuthFlow`, `useCartSession`, `getAllAuthHeaders`, `getAllAuthAccessToken`, `requireAllAuthAccessToken`, `processAllAuthSession`, `createHeaders`, and every `z*` / `Zod*` schema. `test/unit/source-rules/server-imports-are-explicit.spec.ts` fails on an h3 or Nitro name used without an import.

## Inputs to ask for

1. **HTTP method**: GET / POST / PUT / PATCH / DELETE
2. **Route path**: e.g. `products/featured` → `server/api/products/featured/index.get.ts`. Use `[paramName]` for dynamic segments.
3. **Variant**: `cached-list` | `mutating` | `cart` | `allauth-auth` | `allauth-account` | `dynamic-param`
4. **Django endpoint**: e.g. `/blog/post`, `/order/{id}`, `/_allauth/app/v1/auth/login`
5. **Zod schemas**:
   - **Input**: schema name(s) for query/body/params (look first in `shared/openapi/zod.gen.ts` for OpenAPI-generated `z*` names; allauth-only schemas live in `shared/schemas/body/all-auth/...` as `Zod*` PascalCase)
   - **Response**: schema name (same locations)
6. **Cache name** (only for `cached-list`): used as `name` and key prefix; mirror the Django ViewSet (e.g. `BlogPostViewSet`)

If the user can't name a schema, scan `shared/openapi/zod.gen.ts` for one matching the Django operationId before scaffolding from scratch — never invent a schema name that doesn't exist.

## Variant templates

### 1. `cached-list` — paginated GET with SWR caching

Modelled on `server/api/blog/posts/index.get.ts`.

```ts
import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

// Every query parameter the route accepts is a dimension of the answer.
const QUERY_PARAMS = Object.keys({{INPUT_SCHEMA}}.shape)

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, {{INPUT_SCHEMA}})
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}{{DJANGO_PATH}}`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, {{RESPONSE_SCHEMA}})
  }
  catch (error) {
    handleError(event, error)
  }
}, {
  name: '{{CACHE_NAME}}',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60 * 24,
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const parts = QUERY_PARAMS.flatMap((name) => {
      const value = query[name]
      return value === undefined
        ? []
        : [`${name}=${[value].flat().map(item => encodeURIComponent(String(item))).join(',')}`]
    })
    return tenantCacheKey(event, `{{CACHE_NAME_KEBAB}}:${parts.join('&')}`)
  },
})
```

`getKey` gets h3's event, so it reads the query with h3's `getQuery` (and params with `getRouterParams(event, { decode: true })` from `nuxt/server`). The key MUST go through `tenantCacheKey(event, …)`, which adds the store, the locale and the tenant-config epoch: a key without it serves one tenant's data to another (see `.claude/rules/multi-tenant.md`). For a cached detail route, see `server/api/blog/posts/[id]/index.get.ts`.

**Never use this variant for per-user data** (cart, orders, user account, notifications, favourites) — caching leaks across users.

### 2. `mutating` — POST/PUT/PATCH/DELETE with body validation

Modelled on `server/api/blog/comments/index.post.ts`.

```ts
import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, {{INPUT_SCHEMA}})
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}{{DJANGO_PATH}}`, {
      method: '{{METHOD}}',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, {{RESPONSE_SCHEMA}})
  }
  catch (error) {
    handleError(event, error)
  }
})
```

For a public Django endpoint, drop `requireAllAuthAccessToken` and the `Authorization` header (`server/api/search/click.post.ts`). For DELETE without a body, drop `readValidatedBody` and use `parseRouterParams` if the URL carries an id.

### 3. `cart` — uses cart session + may need auth fallback

Modelled on `server/api/cart/index.get.ts`.

```ts
import { FetchError } from 'ofetch'
import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)
  const wideLog = event.context.log
  try {
    const sessionData = await cartSession.getSession()
    const accessToken = await getAllAuthAccessToken(event)

    if (!sessionData.cartId && !accessToken) {
      return null
    }
    if (sessionData.cartId) {
      wideLog?.set({ cart: { id: sessionData.cartId } })
    }

    const headers = await cartSession.getCartHeaders()
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}{{DJANGO_PATH}}`, {
      method: '{{METHOD}}',
      headers,
      // body or query as needed
    })
    const parsed = await parseDataAs(response, {{RESPONSE_SCHEMA}})
    await cartSession.handleCartResponse(parsed)
    return parsed
  }
  catch (error) {
    if (error instanceof FetchError && (error.statusCode === 401 || error.statusCode === 403)) {
      log.info('cart', `Auth expired (${error.statusCode}), returning empty cart`)
      return null
    }
    handleError(event, error)
  }
})
```

### 4. `allauth-auth` — endpoints under `server/api/_allauth/app/v1/auth/...`

Modelled on `server/api/_allauth/app/v1/auth/login.post.ts`. Use `config.djangoUrl` (the full `_allauth` namespace lives off the django root, not `apiBaseUrl`) and `getAllAuthHeaders(event)`. Call `processAllAuthSession(event, response)` on success when the response carries `meta.session_token` / `meta.access_token` / `meta.is_authenticated`. A flow route whose 4xx body the client must read (a pending 2FA step, an `errors` array) returns `forwardAllAuthFlow(event, error)`; a plain read uses `await handleAllAuthError(event, error)` instead.

```ts
import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = event.context.log
  wideLog?.set({ auth: { method: '{{METHOD_LABEL}}' } })
  try {
    const headers = await getAllAuthHeaders(event)
    const body = await readValidatedBody(event, {{INPUT_SCHEMA}})
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1{{DJANGO_PATH}}`, {
      method: '{{METHOD}}',
      body,
      headers,
    })
    const parsed = await parseDataAs(response, {{RESPONSE_SCHEMA}})
    await processAllAuthSession(event, parsed)
    return parsed
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
```

### 5. `allauth-account` — endpoints under `server/api/_allauth/app/v1/account/...`

Modelled on `server/api/_allauth/app/v1/account/email/index.get.ts`. Same as `allauth-auth`. Call `processAllAuthSession(event, response)` wherever the response can carry new session/access tokens (auth endpoints, and account endpoints such as password change — `account/password/change.post.ts`). A mutation whose 4xx payload the client must show returns `forwardAllAuthFlow(event, error)` as in `allauth-auth`.

```ts
import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1{{DJANGO_PATH}}`, {
      method: '{{METHOD}}',
      headers,
      // body if PUT/POST/PATCH
    })
    return await parseDataAs(response, {{RESPONSE_SCHEMA}})
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
})
```

### 6. `dynamic-param` — protected route with `[id]` style segment

Modelled on `server/api/blog/comments/[id]/index.put.ts`.

```ts
import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(event, {{PARAMS_SCHEMA}})
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}{{DJANGO_PATH_WITH_PARAM}}`, {
      method: '{{METHOD}}',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, {{RESPONSE_SCHEMA}})
  }
  catch (error) {
    handleError(event, error)
  }
})
```

`requireAllAuthAccessToken(event)` is intentionally **outside** the try — it throws a clean 401 before any Django call when there's no session.

## Hard rules

- Every Django call goes through `useBackendFetch(event)`; there is no global `$fetch` on the server.
- Input: `getValidatedQuery(event, zSchema)` / `readValidatedBody(event, zSchema)` (pass the schema itself, not `.parse`) and `parseRouterParams(event, zSchema)` for route params.
- `handleError(event, error)` / `handleAllAuthError(event, error)` always throw — never write code after them in the catch. Every auth helper takes `event`.
- Cached GETs use `defineCachedRoute` with a `getKey` built on `tenantCacheKey(event, …)`, never on per-user data.
- `createError(...)` must be `throw`n, never `return`ed.
- File naming: `index.get.ts`, `index.post.ts`, etc. inside the route directory; method must match suffix.
- Route under `_allauth/` → use `config.djangoUrl` and `_allauth/app/v1/...`. Everything else → `config.apiBaseUrl`.
- For cart-only (no auth fallback) variants, just drop the `getAllAuthAccessToken` line.

## Checklist before writing the file

- [ ] Confirmed both schemas exist (grep `shared/openapi/zod.gen.ts` and `shared/schemas/**`).
- [ ] Picked the right `apiBaseUrl` vs `djangoUrl`.
- [ ] Cache variant only if the response is not user-scoped, and its key goes through `tenantCacheKey`.
- [ ] File path matches HTTP method suffix.
- [ ] Every h3 / Nitro helper is imported explicitly (`nuxt/server`, `h3` in `getKey`, `nitropack/runtime`); nothing from `server/utils` or `shared` is.

After writing, suggest the user re-run `pnpm exec eslint --fix <path>` (the `auto-lint` PostToolUse hook will do this automatically on Edit/Write).
