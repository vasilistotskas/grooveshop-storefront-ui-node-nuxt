# Code Review Checklist

Use this checklist when reviewing logging and error handling in this storefront.
`SKILL.md` › **Setup in this repo** holds the patterns it checks against.

## Quick Scan

Run through these checks first to identify improvement opportunities.

### 1. Console Statement Audit

`no-console` is an ESLint error everywhere but `scripts/`, so `pnpm lint:ci`
finds these. Search for them anyway in code under review:

```typescript
// ❌ Patterns to find and transform
console.log(...)
console.error(...)
console.warn(...)
console.info(...)
console.debug(...)
```

**Questions to ask:**

- Are there several log calls about one request?
- Are they logging request or response data?
- Could they be one wide event?

### 2. Error Pattern Audit

Search server routes for these patterns:

```typescript
// ❌ A route's catch that does not go through the helper
catch (error) {
  throw error
}

// ❌ Logging and throwing
catch (error) {
  console.error(error)
  throw error
}

// ❌ The helper without `return`
catch (error) {
  handleError(event, error)
}
```

**Questions to ask:**

- Does every route's `catch` end with `return handleError(event, error)` (or
  one of the helpers that wrap it: `handleAllAuthError`,
  `forwardUpstreamDocumentedError`)? An allauth route that can return a pending
  flow (MFA, multi-step login) catches with `forwardAllAuthFlow` first: it syncs
  the session and returns the envelope allauth clients read.
- Is an error the storefront raises itself a thrown `createError({ status, statusText })`
  from `nuxt/server`?
- On the client, is the failure shown with `useApiError().notify` and caught in
  `try` / `catch`, never in ofetch's `onResponse*` hooks?

### 3. Request Handler Audit

For each API route, check:

```typescript
// ❌ Nothing about the request on its wide event
export default defineEventHandler(async (event) => {
  // No context set, or scattered log calls
})
```

**Questions to ask:**

- Does the route set what identifies its operation on `event.context.log`
  (the cart item, the order, the search query's shape)?
- Is that context set before the handler returns or throws?
- Does it repeat what middleware already sets (store, user id, client)?

## Detailed Review

### Log Call Transformations

#### Single Debug Log

```typescript
// ❌ Before
console.log('Processing cart:', cartId)

// ✅ After, in a route: part of the request's wide event
event.context.log?.set({ cart: { id: cartId } })

// ✅ After, outside a request (a plugin, startup)
log.debug('cart', `Processing cart ${cartId}`)
```

Production keeps no debug lines (`debug: 0` in `$production.evlog.sampling.rates`).

#### Multiple Related Logs

```typescript
// ❌ Before
console.log('Starting checkout')
console.log('Cart items:', cart.items.length)
console.log('Total:', cart.total)

// ✅ After, in app code: one event in the object form
log.info({
  action: 'checkout:start',
  cart: { items: cart.items.length, total: cart.total },
})
```

#### Request Lifecycle Logs

```typescript
// ❌ Before
export default defineEventHandler(async (event) => {
  console.log('Request started')
  const body = await readValidatedBody(event, zBody)
  console.log('Body read')
  const response = await useBackendFetch(event)(url, { method: 'POST', body })
  console.log('Done')
  return response
})

// ✅ After
import { defineEventHandler, readValidatedBody } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const wideLog = event.context.log

  try {
    const body = await readValidatedBody(event, zBody)
    wideLog?.set({ cart: { item: { productId: body.product } } })
    const response = await useBackendFetch(event)(url, { method: 'POST', body })
    return await parseDataAs(response, zResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
  // evlog emits the wide event at request end
})
```

### Error Transformations

#### Log-and-Throw in a Route

```typescript
// ❌ Before
try {
  return await useBackendFetch(event)(url)
}
catch (error) {
  console.error('Backend call failed:', error)
  throw error
}

// ✅ After: handleError logs it once, at the right level, and answers
try {
  return await useBackendFetch(event)(url)
}
catch (error) {
  return handleError(event, error)
}
```

#### Returned Instead of Thrown

```typescript
// ❌ Before
return createError({ status: 404, statusText: 'Not Found' })

// ✅ After
throw createError({ status: 404, statusText: 'Not Found' })
```

A plain `throw new Error(...)` stays right for a programmer error or a startup
check that is no HTTP answer (`server/plugins/startup-validation.ts`).

## Review Checklist Summary

### Logging

- [ ] No `console.*` outside `scripts/`
- [ ] Request context is set on `event.context.log` in `nuxt/server` handlers
- [ ] Context is set before the request logger emits (route or middleware, never an `evlog:enrich` hook)
- [ ] No drain, `evlog:drain` hook or `silent` added
- [ ] `log.*` calls with context use the object form, never a third argument

### Errors

- [ ] Every route's `catch` ends with `return handleError(event, error)`, `handleAllAuthError` or `forwardUpstreamDocumentedError`
- [ ] Nothing follows `handleError`
- [ ] Errors the storefront raises are `throw createError({ status, statusText })` from `nuxt/server`
- [ ] No `createEvlogError` / `parseError` introduced: they are not the error contract here

### Frontend Error Handling

- [ ] A failed `$api` call is handled in `try` / `catch` / `finally` (`test/unit/source-rules/api-errors-are-caught.spec.ts`)
- [ ] Error toasts go through `useApiError().notify` or `useApiFormErrors().reportFailure` (`test/unit/source-rules/errors-go-through-the-helper.spec.ts`), so the shopper sees Django's reason from `error.data`
- [ ] Logged failures are `log.error({ action, error })`; a site that wants the request id adds `requestId: requestIdOf(error)`

### Context

- [ ] Business context is domain-specific and useful for debugging (cart, order, search, store)
- [ ] Not set again: the store, user id and client facts (middleware), method, path, request id, status and duration (evlog)
- [ ] No sensitive data: no passwords, tokens, raw User-Agent, OS version, email, address or anything a customer typed

## Anti-Pattern Summary

| Anti-Pattern | Fix |
|--------------|-----|
| Several log calls about one request | One wide event with `event.context.log?.set()` |
| `console.error(e); throw e` in a route | `return handleError(event, error)` |
| `return createError(...)` | `throw createError(...)` |
| No context on a request handler | `event.context.log?.set({ ... })` |
| Flat log data | Grouped objects: `{ user: {...}, cart: {...} }` |
| Abbreviated field names | Descriptive names: `productId` not `pid` |

## Suggested Review Comments

Use these when leaving review feedback:

### Console Statement Found

> `no-console` fails lint here. Put this route's context on its wide event with
> `event.context.log?.set({ ... })`, or use `log.*` outside a request.

### Error Bypasses the Helper

> This `catch` should end with `return handleError(event, error)`: it logs the
> failure at the right level and gives the client Django's body in one shape.

### Missing Request Context

> This route's wide event says nothing about what it did. Set the identifying
> fields with `event.context.log?.set({ ... })` before it returns.

### Good Logging (Positive Feedback)

> Nice use of the wide event: the context is grouped and explicit, and nothing
> sensitive reaches the log.
