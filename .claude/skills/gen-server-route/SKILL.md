---
name: gen-server-route
description: Scaffold a new Nitro server API route under server/api/ following the project's strict 4-step pattern (Zod input → $fetch to Django → parseDataAs response → handleError catch). Use when adding a new endpoint that proxies the Django backend. Pick the right variant — cached GET, mutating POST/PUT/PATCH, cart-aware, allauth-protected, or dynamic-param.
disable-model-invocation: true
---

# Generate Server Route

Creates a new server route file under `server/api/...` (or `server/api/_allauth/app/v1/...` for auth) following the conventions enforced by the `api-route-validator` agent. Always uses Nitro auto-imports — do **not** add explicit imports for `$fetch`, `defineEventHandler`, `defineCachedEventHandler`, `getValidatedQuery`, `readValidatedBody`, `getValidatedRouterParams`, `useRuntimeConfig`, `useCartSession`, `useLogger`, `getAllAuthHeaders`, `requireAllAuthAccessToken`, `getAllAuthAccessToken`, `processAllAuthSession`, `parseDataAs`, `handleError`, `handleAllAuthError`, `createError`, or any `z*` Zod schema. The only explicit imports needed are third-party types like `FetchError` from `ofetch`.

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

```ts
export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, {{INPUT_SCHEMA}}.parse)
    const response = await $fetch(`${config.apiBaseUrl}{{DJANGO_PATH}}`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, {{RESPONSE_SCHEMA}})
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: '{{CACHE_NAME}}',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60 * 24,
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '10',
      query.languageCode || 'el',
      query.paginationType || 'pageNumber',
      query.page || '1',
      query.ordering || '',
      query.cursor || '',
    ]
    return `{{CACHE_NAME_KEBAB}}:${keyParts.join(':')}`
  },
})
```

**Never use this variant for per-user data** (cart, orders, user account, notifications, favourites) — caching leaks across users.

### 2. `mutating` — POST/PUT/PATCH/DELETE with body validation

```ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, {{INPUT_SCHEMA}}.parse)
    const response = await $fetch(`${config.apiBaseUrl}{{DJANGO_PATH}}`, {
      method: '{{METHOD}}',
      body,
    })
    return await parseDataAs(response, {{RESPONSE_SCHEMA}})
  }
  catch (error) {
    await handleError(error)
  }
})
```

For DELETE without a body, drop `readValidatedBody` and use `getValidatedRouterParams` if the URL carries an id.

### 3. `cart` — uses cart session + may need auth fallback

```ts
import { FetchError } from 'ofetch'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cartSession = useCartSession(event)
  const wideLog = useLogger(event)
  try {
    const sessionData = await cartSession.getSession()
    const accessToken = await getAllAuthAccessToken(event)

    if (!sessionData.cartId && !accessToken) {
      return null
    }
    if (sessionData.cartId) {
      wideLog.set({ cart: { id: sessionData.cartId } })
    }

    const headers = await cartSession.getCartHeaders()
    const response = await $fetch(`${config.apiBaseUrl}{{DJANGO_PATH}}`, {
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
    await handleError(error)
  }
})
```

### 4. `allauth-auth` — endpoints under `server/api/_allauth/app/v1/auth/...`

Use `config.djangoUrl` (the full `_allauth` namespace lives off the django root, not `apiBaseUrl`). Use `getAllAuthHeaders()` and `handleAllAuthError`. Call `processAllAuthSession` on success when the response carries `meta.session_token` / `meta.access_token` / `meta.is_authenticated`.

```ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = useLogger(event)
  wideLog.set({ auth: { method: '{{METHOD_LABEL}}' } })
  try {
    const headers = await getAllAuthHeaders()
    const body = await readValidatedBody(event, {{INPUT_SCHEMA}}.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1{{DJANGO_PATH}}`, {
      method: '{{METHOD}}',
      body,
      headers,
    })
    const parsed = await parseDataAs(response, {{RESPONSE_SCHEMA}})
    await processAllAuthSession(parsed)
    return parsed
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
```

### 5. `allauth-account` — endpoints under `server/api/_allauth/app/v1/account/...`

Same as `allauth-auth` but **never** call `processAllAuthSession` (account endpoints don't change auth state — they manage email/password/providers/authenticators).

```ts
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1{{DJANGO_PATH}}`, {
      method: '{{METHOD}}',
      headers,
      // body if PUT/POST/PATCH
    })
    return await parseDataAs(response, {{RESPONSE_SCHEMA}})
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
```

### 6. `dynamic-param` — protected route with `[id]` style segment

```ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(event, {{PARAMS_SCHEMA}}.parse)
    const response = await $fetch(`${config.apiBaseUrl}{{DJANGO_PATH_WITH_PARAM}}`, {
      method: '{{METHOD}}',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, {{RESPONSE_SCHEMA}})
  }
  catch (error) {
    await handleError(error)
  }
})
```

`requireAllAuthAccessToken()` is intentionally **outside** the try — it throws a clean 401 before any Django call when there's no session.

## Hard rules

- `useRuntimeConfig()` is called inside the try block (before any `$fetch`).
- `handleError` / `handleAllAuthError` always throw — never write code after them in the catch.
- `createError(...)` must be `throw`n, never `return`ed.
- File naming: `index.get.ts`, `index.post.ts`, etc. inside the route directory; method must match suffix.
- Route under `_allauth/` → use `config.djangoUrl` and `_allauth/app/v1/...`. Everything else → `config.apiBaseUrl`.
- Paginated responses wrap the item schema with `ZodPagination(itemSchema)` (not the OpenAPI flat list).
- For cart-only (no auth fallback) variants, just drop the `getAllAuthAccessToken` line.

## Checklist before writing the file

- [ ] Confirmed both schemas exist (grep `shared/openapi/zod.gen.ts` and `shared/schemas/**`).
- [ ] Picked the right `apiBaseUrl` vs `djangoUrl`.
- [ ] Cache variant only if the response is not user-scoped.
- [ ] File path matches HTTP method suffix.
- [ ] No explicit imports added for auto-imported helpers.

After writing, suggest the user re-run `npx eslint --fix <path>` (the `auto-lint` PostToolUse hook will do this automatically on Edit/Write).
