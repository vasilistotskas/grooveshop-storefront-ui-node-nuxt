# API Route Validator

Validate that server API routes in `server/api/` follow the established project conventions and patterns.

## Required Pattern

Every server API route must follow this structure:

```typescript
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    // 1. Validate input with Zod
    const query = await getValidatedQuery(event, zSchema.shape.query.parse)
    // OR for POST/PUT:
    const body = await readValidatedBody(event, zSchema.shape.body.parse)

    // 2. Fetch from Django
    const response = await $fetch(`${config.apiBaseUrl}/endpoint`, {
      method: 'GET',
      query,  // or body
    })

    // 3. Validate and return response
    return await parseDataAs(response, zResponseSchema)
  }
  catch (error) {
    // 4. Error handling (always throws)
    await handleError(error)
  }
})
```

## Checklist

### Input Validation
- [ ] GET routes use `getValidatedQuery(event, zodSchema.parse)`
- [ ] POST/PUT/PATCH routes use `readValidatedBody(event, zodSchema.parse)`
- [ ] Zod schemas imported from `shared/schemas/` or `shared/openapi/zod.gen.ts`
- [ ] No use of raw `getQuery()` or `readBody()` without validation (except known exceptions: `server/api/products/categories/index.get.ts`, `server/api/products/attributes/`)

### Django Proxy
- [ ] Uses `$fetch()` with `config.apiBaseUrl` prefix
- [ ] HTTP method matches the file suffix (`.get.ts` = GET, `.post.ts` = POST, etc.)
- [ ] Auth-protected routes include proper headers via `getAllAuthHeaders()` or `requireAllAuthAccessToken()`
- [ ] Cart routes use `useCartSession(event)` for `X-Cart-Id` header

### Response Validation
- [ ] Response validated with `parseDataAs(response, zodSchema)`
- [ ] Zod schema matches the expected Django API response structure
- [ ] Paginated responses use `ZodPagination(itemSchema)` wrapper

### Error Handling
- [ ] `handleError(error)` in catch block (for general routes)
- [ ] `handleAllAuthError(error)` in catch block (for auth routes under `_allauth/`)
- [ ] NO code after `handleError()` / `handleAllAuthError()` (they always throw)
- [ ] `createError()` is always `throw`n, never `return`ed

### Caching (for cacheable GET routes)
- [ ] Uses `defineCachedEventHandler()` wrapper
- [ ] Has `name` for cache identification
- [ ] Has `maxAge` and `staleMaxAge` with `swr: true`
- [ ] `getKey` function produces stable, unique cache keys including all relevant query params
- [ ] NOT used on per-user data (cart, orders, user account, notifications)

### Auth Routes (`server/api/_allauth/`)
- [ ] Uses `getAllAuthHeaders()` for forwarding session/access tokens
- [ ] Uses `processAllAuthSession()` after successful auth responses
- [ ] Uses `handleAllAuthError()` instead of `handleError()`
- [ ] Response hooks call `allAuthHooks.callHookParallel('authChange', ...)` where needed

## Known Exceptions
- `server/api/products/categories/index.get.ts` — Uses `getQuery` without Zod validation (manually sanitized)
- `server/api/products/attributes/` — Uses `getQuery` without Zod validation (manually built query)
- `server/api/subscriptions/user/bulk-subscribe.post.ts` — No response Zod schema exists in OpenAPI spec
- `server/api/auth/oauth-params.get.ts` — Reads directly from session, not a Django proxy
- `server/routes/rss.xml.get.ts` — Static route, not an API proxy
- `server/api/__sitemap__/urls.ts` — Sitemap utility, custom pattern
