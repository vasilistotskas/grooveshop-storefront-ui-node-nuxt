# Error Handling Guide

A failure in this storefront tells three readers what happened: the shopper
(Django's reason, in their language), the log (one line at the right level)
and whoever joins the two (the request id). The helpers below do all three;
code under review should go through them rather than build its own.

## Server Routes

### The `catch` of Every Route

```typescript
catch (error) {
  return handleError(event, error)
}
```

`handleError` (`server/utils/error.ts`) answers in one shape:

- A Django 4xx that carries a body is **returned** with Django's status, so the
  client's `error.data` is exactly Django's body (`code`, per-field errors, the
  sentence).
- Anything else goes through `rejectError`, which logs it once and throws:
  - a request the client closed: `warn`, answered 499;
  - a request that failed its schema: `warn` (`action: 'validation:request'`);
  - a response that failed its schema (Django and `shared/openapi` drifted):
    `error` (`action: 'validation:response'`);
  - a Django error without a body to forward: `warn` for 4xx, `error` for 5xx
    (`action: 'upstream:fetch'`); a 5xx body is never forwarded, since it can
    leak a dependency's diagnostics.

It is typed `never`, so the compiler cannot catch a missing `return`;
`test/unit/source-rules/handle-error-is-returned.spec.ts` does. Two helpers
wrap it, for the routes that need them:

- `handleAllAuthError`, on allauth routes: syncs the session from the error
  first;
- `forwardUpstreamDocumentedError(event, error, schema)`, on a route that
  documents a 5xx answer of its own: returns that body when `schema` validates
  it, and calls `handleError` otherwise.

A route that turns one upstream 4xx into its own body (the 409 of
`server/api/cart/reserve-stock.post.ts`) logs it with `log.warn` and falls
back to `return handleError(event, error)` for every other failure.

### Errors the Storefront Raises

h3's `createError` from `nuxt/server`, thrown, with a status and a short status
text:

```typescript
import { createError } from 'nuxt/server'

throw createError({ status: 503, statusText: 'Service Unavailable' })
throw createError({ status: 404, statusText: 'Store not found' })
```

Pass `data` only when the client reads it (`server/utils/parser.ts` attaches the
Zod issues). A plain `throw new Error(...)` is right for a programmer error or a
startup check, which is no HTTP answer (`server/plugins/startup-validation.ts`).

evlog's own structured error (`createEvlogError` with `why`, `fix`, `link`) and
`parseError` are auto-imported by `evlog/nuxt`, but they are not this contract:
the shopper's reason is Django's body, read by `useApiError`. Do not introduce
them.

### What Reaches the Wide Event

evlog records an error thrown out of a handler on the request's wide event and
logs the request at `error`. `server/plugins/evlog-client-error-level.ts` turns
a 4xx into `warn` (a response that failed its own schema stays `error`), and
`sampling.keep: [{ status: 400 }]` keeps every one of them. A route therefore
adds no `log.error` of its own before `handleError`: the failure would be
logged twice.

## Client Code

### Showing a Failure

Every error toast in a `catch` goes through `useApiError().notify` (or
`useApiFormErrors().reportFailure`); a hand-written error toast throws away the
reason Django gave (`test/unit/source-rules/errors-go-through-the-helper.spec.ts`).
`notify` shows the action's headline, Django's reason, and behind a details
button the stable code and the request id.

### Logging a Failure

From `app/components/Product/Review.vue`:

```typescript
try {
  const created = await $api('/api/products/reviews', { method: 'POST', body: reviewBody(event) })
  // ...
}
catch (error) {
  log.error({ action: 'review:create', error, requestId: requestIdOf(error) })
  notify('review:create', error, { title: t('add.error') })
}
```

- The `action` names the operation; the `error` is nested in the event. The
  ingest (`server/plugins/evlog-client-context.ts`) reduces a nested response
  body to an allowlist (`server/utils/clientEventRedaction.ts`): every value but a
  field name, an identifier-shaped `code` / `reason` / `type` / `param` and an HTTP
  status is replaced. The error's own `message` is kept, and so is an identifier-shaped
  value, so never put customer text in a `message`, `code` or `reason` you raise.
- `requestId: requestIdOf(error)` (`shared/utils/error.ts`) joins the browser
  line to the server and Django lines of the same request.
- A connection failure (a chunk the browser could not download, a `fetch` with
  no response) is printed at `warn` by the ingest; the call site does not
  classify it.

The global error hooks (`app/plugins/error-reporting.client.ts`) already report
uncaught errors; a component does not log what it rethrows.

## Field Guidelines

- `action`: `<area>:<operation>`, stable, so a query can group by it
  (`checkout:submit`, `review:create`).
- A message names what failed, not "Error" or "Something went wrong".
- Never put a password, token, email, address, raw User-Agent, OS version or a
  customer's text in a log field.
