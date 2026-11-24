# Wide Events Guide

A wide event is one log entry that carries all the context of one operation,
usually a request. evlog creates one per request (except the paths in
`evlog.exclude`), and prints it when the request ends.

## Why Wide Events?

Traditional logging scatters one request across many lines:

```text
10:23:45.001 Request received POST /api/orders
10:23:45.045 Cart loaded: 3 items
10:23:45.234 Order failed: 409 total_changed
10:23:45.235 Request completed: 409
```

During an incident you grep through thousands of these to rebuild what
happened. A wide event is one line with everything (a production line,
trimmed):

```json
{
  "level": "warn",
  "service": "grooveshop-storefront",
  "method": "POST",
  "path": "/api/orders",
  "status": 409,
  "duration": "234ms",
  "requestId": "…",
  "tenantSchema": "…",
  "user": { "id": 42 },
  "client": { "browser": "…", "os": "…", "deviceClass": "mobile", "bot": false },
  "order": { "created": false }
}
```

In VictoriaLogs a storefront event's path is its `_msg`, not a `path` field
(`.claude/rules/server-runtime.md`).

## What Sets Which Field

| Fields | Set by |
|--------|--------|
| `method`, `path`, `requestId`, `status`, `duration`, a thrown error | evlog |
| `tenantSchema`, `tenantName` | `server/middleware/0.tenant.ts` |
| `user.id` | `server/middleware/2.evlog-auth.ts` |
| `client` | `server/middleware/2.evlog-client.ts` |
| The operation's own context | The route |

A route sets only the last row. Everything must be set before the request
logger emits: an `evlog:enrich` hook runs after the line is printed and feeds
drains only, and there is no drain.

## When to Use Wide Events

| Scenario | Use |
|----------|-----|
| An `/api` route | Its wide event: `event.context.log?.set()` |
| A helper a route calls (`server/utils/cartClaim.ts`) | The same wide event, through the event it is given |
| A Nitro plugin, startup, a cache sweep | A `log.*` line: there is no request |
| A browser action | `log.info` / `log.error` in the object form, one event per action |
| Debug statements | Remove them; production keeps no debug lines |

## Pattern: Context in an API Route

From `server/api/orders/index.post.ts` (trimmed):

```typescript
import { defineEventHandler, readValidatedBody } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const wideLog = event.context.log

  try {
    wideLog?.set({ order: { created: false } })
    const body = await readValidatedBody(event, zCreateOrderBody)
    // ... Django call ...
    const parsedData = await parseDataAs(response, zCreateOrderResponse)

    wideLog?.set({ order: { created: true } })
    return parsedData
  }
  catch (error) {
    // `handleError`, plus this route's one documented 5xx body
    return forwardUpstreamDocumentedError(event, error, zPickupPointCheckUnavailable)
  }
})
```

- Set what identifies the operation (`cart.item.productId`, `order.created`,
  the shape of a search) as soon as it is known, so a request that fails
  half-way still carries it.
- `handleError` logs the failure and evlog records the thrown error on the
  wide event; the route adds no `log.error` of its own.
- `event.context.log` is typed as optional (`shared/types/request-context.d.ts`):
  call it with `?.`.

## Best Practices

### Do

- Group fields by domain object: `{ cart: {...}, order: {...} }`
- Use the same field names as the other routes (`grep -rn "context.log" server`)
- Set a field once the value is known, not at the end
- Let evlog compute `duration` and `status`

### Don't

- Set the store, user or client again: middleware already does
- Log several lines about one request
- Add an `evlog:enrich` hook expecting it to change a server event's line
- Add a drain or `silent`

## Security: Preventing Sensitive Data Leakage

Always select the fields to log explicitly:

```typescript
// ❌ Logs everything the customer sent
wideLog?.set({ order: body })

// ✅ Explicit fields
wideLog?.set({ cart: { item: { productId: body.product, quantity: body.quantity } } })
```

**Never log:** passwords, tokens, session cookies, API keys, email addresses,
postal addresses, phone numbers, card data, a raw User-Agent, an OS version, or
any text a customer typed. Log ids, not people.

Browser events are redacted by an allowlist at the ingest
(`server/utils/clientEventRedaction.ts`); server events are not, so a route's
own fields are the only guard there.

See [code-review.md](code-review.md) for the full review checklist.

## Field Naming Conventions

Use consistent, descriptive field names:

```typescript
// ✅ Grouped, descriptive
wideLog?.set({
  cart: { items, total },
  order: { created },
})

// ❌ Flat, abbreviated
wideLog?.set({
  n: 3,
  t: 9999,
  oc: true,
})
```
