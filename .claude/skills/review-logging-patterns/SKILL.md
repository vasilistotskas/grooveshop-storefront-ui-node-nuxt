---
name: review-logging-patterns
description: Review logging in this Nuxt storefront (evlog/nuxt). Finds console.* calls, failures that bypass handleError, flat or sensitive log fields, and requests whose wide event lacks context. Covers wide events, the error contract, sampling and the evlog Nitro hooks.
license: MIT
metadata:
  author: HugoRCD
---

# Review logging patterns

Review and improve logging in this storefront: turn scattered `console.*` and
`log.*` calls into one wide event per request, and make every failure go
through the repo's error contract.

The repo's own rules win over anything in this skill: read
`.claude/rules/server-runtime.md` › **Structured Logging (evlog)** first. It
documents what reaches the log line, the client-error level downgrade, browser
error reports and the request id.

## When to Use

- Reviewing code for logging best practices
- Replacing `console.*` calls (`no-console` is an ESLint error everywhere but `scripts/`)
- Reviewing how a route or a client call handles a failure
- Adding context to a request's wide event

---

## Setup in this repo

evlog is already installed as the `evlog/nuxt` module in `nuxt.config.ts`. Do
not add it again.

### Server code (`server/**`)

Import h3 and Nitro helpers explicitly, from `nuxt/server`
(`test/unit/source-rules/server-imports-are-explicit.spec.ts`). Read the
request's wide-event logger from `event.context.log` (evlog's `useLogger(event)`
is typed on h3's event, so `nuxt/server` code takes the logger from the
context). From `server/api/cart/items/index.post.ts`:

```typescript
import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cartSession = useCartSession(event)
  const wideLog = event.context.log

  try {
    const headers = await cartSession.getCartHeaders()
    const body = await readValidatedBody(event, zCreateCartItemBody)
    // Explicit, grouped fields; never the whole body.
    wideLog?.set({ cart: { item: { productId: body.product, quantity: body.quantity } } })
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/cart/item`, {
      method: 'POST',
      headers,
      body,
    })
    const parsedData = await parseDataAs(response, zCreateCartItemResponse)
    // ...
    return parsedData.cart
  }
  catch (error) {
    return handleError(event, error)
  }
})
```

- **No drain.** `evlog` prints the stdout line that Vector ships to
  VictoriaLogs at emit. `evlog:enrich` hooks run after that and feed drains
  only, so a field added there never reaches a SERVER event's line. Do not
  suggest a drain adapter, an `evlog:drain` hook or `silent`; the rules file
  explains why.
- A field must be set on the request logger BEFORE it emits: in the route, or
  in a middleware (`server/middleware/0.tenant.ts`, `2.evlog-auth.ts`,
  `2.evlog-client.ts`). Those middleware already set the store, the user id
  and the client; a route does not set them again.
- evlog sets `method`, `path`, `requestId`, `status` and `duration` itself,
  and records an error thrown out of the handler on the wide event (its Nitro
  `error` hook). Do not set those fields by hand.
- Failures go through `handleError(event, error)`, or the helpers that wrap
  it, `handleAllAuthError` and `forwardUpstreamDocumentedError`
  (`server/utils/error.ts`); they log the failure and always return or throw,
  and nothing follows them. `return handleError(...)` is enforced by
  `test/unit/source-rules/handle-error-is-returned.spec.ts`.
- `log.*` is auto-imported on the server too: use it for what is not one
  request (plugins, startup, cache sweeps, an extra line a helper owns).
- A Nitro plugin's hook receives h3's event, so `useLogger(event)` works there
  (`server/plugins/evlog-client-error-level.ts`).

### App code (`app/**`)

`log` is auto-imported. It is evlog's browser logger: during SSR it does
nothing. Use the simple form, `log.info('tag', 'message')`, or the wide-event
object form for anything with context:

```typescript
log.info({ tag: 'cart', message: 'Cart merged', itemCount: 3 })
log.error({ action: 'checkout:submit', error })
```

Arguments after the message are formatted into the message text (`%s`, `%d`,
`%j`, the rest appended), never kept as fields, so context always goes in the
object form.

Browser events reach `POST /api/_evlog/ingest`, where
`server/plugins/evlog-client-context.ts` redacts, samples and enriches them.
Never log a raw User-Agent, an OS version, or anything a customer typed.

`log` is NOT auto-imported in `i18n/` (outside the Nuxt auto-import scope).

---

## Configuration in this repo

Set under the `evlog` key in `nuxt.config.ts`; read the file for the values:

| Key | Where | What it does here |
|-----|-------|-------------------|
| `env.service` | `evlog` | Names the service on every event (`grooveshop-storefront`) |
| `exclude` | `evlog` | The asset, probe and error re-render paths that get no wide event; every other request, page renders included, gets one |
| `transport.enabled` | `evlog` | Sends browser logs to `/api/_evlog/ingest` |
| `pretty` | `$production.evlog` | `false`, so the browser console prints one JSON line (`test/unit/source-rules/evlog-prints-a-string-in-production.spec.ts`) |
| `sampling.rates` | `$production.evlog` | Head sampling per level, in percent |
| `sampling.keep` | `$production.evlog` | Tail sampling: a request matching any rule (status, duration, path) is always kept |

Every other option, with its default, is `ModuleOptions` in
`node_modules/evlog/dist/nuxt/module.d.mts`.

### Nitro hooks

evlog's hooks are typed as `NitroRuntimeHooks` in evlog's `dist/types-*.d.mts`:

| Hook | When | Here |
|------|------|------|
| `evlog:emit:keep` | Before a request event is emitted | Custom tail sampling; unused (the `sampling.keep` rules cover it) |
| `evlog:enrich` | After emit, before drain | Browser events only: `server/plugins/evlog-client-context.ts` |
| `evlog:drain` | After enrichment | Unused: there is no drain |

---

## Errors

A route's failure is `return handleError(event, error)` in its `catch`: a
Django 4xx with a body is returned with Django's status, so the client's
`error.data` is Django's body; anything else goes through `rejectError`,
which logs it and never forwards a 5xx body. An error the storefront raises
itself is h3's `createError` from `nuxt/server`, thrown, never returned:

```typescript
import { createError } from 'nuxt/server'

throw createError({ status: 404, statusText: 'Store not found' })
```

evlog's own `createEvlogError` (`why`, `fix`, `link`) and `parseError` are
auto-imported but not part of this contract; do not introduce them. On the
client, a failed call is shown with `useApiError().notify` (or
`useApiFormErrors().reportFailure`) and logged with
`log.error({ action, error })`. See
[references/structured-errors.md](references/structured-errors.md).

---

## Anti-Patterns to Detect

| Anti-Pattern | Fix |
|--------------|-----|
| `console.*` outside `scripts/` | `log.*`, or `event.context.log?.set(...)` for request context; `no-console` fails lint |
| Several `log.*` lines about one request | One wide event: `wideLog?.set({ ... })` |
| `console.error(e); throw e` or `log.error(e); throw e` in a route | `return handleError(event, error)` in the route's `catch` |
| `handleError(event, error)` without `return` | `return handleError(event, error)` |
| `return createError(...)` | `throw createError(...)` (from `nuxt/server`) |
| No context on a request handler | `event.context.log?.set({ ... })` with grouped fields |
| Flat log data `{ uid, n, t }` | Grouped objects: `{ user: {...}, cart: {...} }` |
| Logging a whole body `log.set({ user: body })` | Explicit fields: `{ cart: { item: { productId: body.product } } }` |
| A drain, or an `evlog:enrich` hook expecting to change a server event's line | Set the field on the request logger before emit (see above) |
| `useLogger(event)` in a `nuxt/server` handler | `event.context.log` |
| A third argument to `log.info('tag', 'msg', ctx)` | The object form: `log.info({ tag, message, ...ctx })` |

---

## Loading Reference Files

Load based on what you're working on; **do not load all at once**:

- Designing wide events → [references/wide-events.md](references/wide-events.md)
- Reviewing error handling → [references/structured-errors.md](references/structured-errors.md)
- Full code review → [references/code-review.md](references/code-review.md)
