---
name: review-logging-patterns
description: Review code for logging patterns in this Nuxt storefront (evlog/nuxt). Detects console.log spam, unstructured errors, and missing wide-event context. Covers wide events, structured errors, sampling, and the evlog Nitro hooks.
license: MIT
metadata:
  author: HugoRCD
  version: "0.5"
---

# Review logging patterns

Review and improve logging patterns in this storefront. Transform scattered
`console.log`s into structured wide events and convert generic errors into
self-documenting structured errors.

The repo's own rules win over anything generic in this skill: read
`.claude/rules/server-routes.md` › **Structured Logging (evlog)** first. It
documents what reaches the log line, the client-error level downgrade, browser
error reports and the request id.

## When to Use

- Reviewing code for logging best practices
- Converting `console.log` statements to structured logging (`no-console` is an ESLint error here)
- Improving error handling with better context
- Adding context to a request's wide event

## Quick Reference

| Working on...           | Resource                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| Wide events patterns    | [references/wide-events.md](references/wide-events.md)             |
| Error handling          | [references/structured-errors.md](references/structured-errors.md) |
| Code review checklist   | [references/code-review.md](references/code-review.md)             |
| Drain pipeline          | [references/drain-pipeline.md](references/drain-pipeline.md)       |

The references are generic evlog guidance. Where they show `useLogger(event)`,
a drain or an auto-imported `createError`, this repo's rules below take
precedence.

---

## Setup in this repo

evlog is already installed as the `evlog/nuxt` module in `nuxt.config.ts`
(`evlog` key: sampling, `exclude`, client transport). Do not add it again.

### Server code (`server/**`)

Import h3 and Nitro helpers explicitly, from `nuxt/server`. Read the request's
wide-event logger from `event.context.log` (evlog's `useLogger(event)` is typed
on h3's event, so `nuxt/server` code takes the logger from the context):

```typescript
// server/api/cart/items/index.post.ts
import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = event.context.log

  try {
    const body = await readValidatedBody(event, zCreateCartItemBody)
    // Explicit, grouped fields; never the whole body.
    wideLog?.set({ cart: { item: { productId: body.product, quantity: body.quantity } } })
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/cart/item`, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, zCreateCartItemResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
```

- **No drain.** `evlog` prints the stdout line that Vector ships to
  VictoriaLogs at emit. `evlog:enrich` hooks run after that and feed drains
  only, so a field added there never reaches a SERVER event's line. Do not
  suggest a drain adapter, `evlog:drain` plugin or `silent`; the rules file
  explains why.
- A field must be set on the request logger BEFORE it emits: in the route, or
  in a middleware (`server/middleware/0.tenant.ts`, `2.evlog-auth.ts`,
  `2.evlog-client.ts`).
- Failures go through `handleError(event, error)` / `handleAllAuthError`, which
  always `return`/throw; nothing follows them.
- Use `throw createError(...)` (from `nuxt/server`), never `return createError(...)`.

### App code (`app/**`)

`log` is auto-imported on the client. Use the simple form with at most two
arguments (`log.info('tag', 'message')`: evlog silently drops a third) or the
wide-event object form:

```typescript
log.info({ tag: 'cart', message: 'Cart merged', itemCount: 3 })
log.error({ action: 'checkout:submit', error })
```

Browser events reach `POST /api/_evlog/ingest`, where
`server/plugins/evlog-client-context.ts` redacts, samples and enriches them.
Never log a raw User-Agent, an OS version, or anything a customer typed.

`log` is NOT auto-imported in `i18n/` (outside the Nuxt auto-import scope).

---

## Configuration Options

Set under the `evlog` key in `nuxt.config.ts`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `env.service` | `string` | `'app'` | Service name in logs |
| `enabled` | `boolean` | `true` | Global toggle (no-ops when false) |
| `pretty` | `boolean` | `true` in dev | Pretty tree format vs JSON |
| `silent` | `boolean` | `false` | Suppress console output. Events still go to drains (this repo has none) |
| `include` | `string[]` | All routes | Route glob patterns to log |
| `exclude` | `string[]` | None | Route patterns to exclude (takes precedence) |
| `routes` | `Record<string, { service }>` | -- | Route-specific service names |
| `sampling.rates` | `object` | -- | Head sampling: `{ info: 10, warn: 50 }` (0-100%) |
| `sampling.keep` | `array` | -- | Tail sampling: `[{ status: 400 }, { duration: 1000 }]` |

### Nitro Hooks

| Hook | When | Use |
|------|------|-----|
| `evlog:drain` | After enrichment | Send events to external services (unused here: no drain) |
| `evlog:enrich` | After emit, before drain | Add derived context to browser events and drains |
| `evlog:emit:keep` | During emit | Custom tail sampling logic |
| `close` | Server shutdown | Flush drain pipeline buffers |

---

## AI SDK Integration

Capture token usage, tool calls, model info, and streaming metrics from the
Vercel AI SDK into wide events with `createAILogger` from `evlog/ai` (requires
`ai >= 6.0.0` as a peer dependency). The storefront does not use the AI SDK
today; reach for this only if it starts to.

```typescript
import { createAILogger } from 'evlog/ai'

const ai = createAILogger(event.context.log)
const result = streamText({ model: ai.wrap('anthropic/claude-sonnet-4.6'), messages })
```

| Anti-Pattern | Fix |
|--------------|-----|
| Manual token tracking in `onFinish` | `ai.wrap()` — middleware captures automatically |
| `console.log('tokens:', result.usage)` | `ai.wrap()` — structured `ai.*` fields in wide event |

---

## Structured Errors

```typescript
import { createError } from 'nuxt/server'

// Minimal
throw createError({ status: 500, message: 'Database connection failed' })
```

evlog's `createError` also accepts `why`, `fix`, `link` and `cause` for
self-documenting errors; on the client, `parseError(err)` extracts them. See
[references/structured-errors.md](references/structured-errors.md) for the
patterns and templates. In this repo's proxy routes the error contract is
`handleError` (`server/utils/error.ts`), so do not replace it with a hand-built
error.

---

## Anti-Patterns to Detect

| Anti-Pattern | Fix |
|--------------|-----|
| `console.*` anywhere | `log.*` (app) or `event.context.log` (server); `no-console` fails lint |
| Multiple `log` calls in one handler | Single wide event with `wideLog?.set({ ... })` |
| `console.error(e); throw e` | `return handleError(event, error)` in the route's `catch` |
| No context on a request handler | `event.context.log?.set({ ... })` with grouped fields |
| Flat log data `{ uid, n, t }` | Grouped objects: `{ user: {...}, cart: {...} }` |
| Logging sensitive data `log.set({ user: body })` | Explicit fields: `{ user: { id: body.id, plan: body.plan } }` |
| A drain, or an `evlog:enrich` hook expecting to change a server event's line | Set the field on the request logger before emit (see above) |
| `useLogger(event)` in `nuxt/server` code | `event.context.log` |

See [references/code-review.md](references/code-review.md) for the full checklist.

---

## Loading Reference Files

Load based on what you're working on — **do not load all at once**:

- Designing wide events → [references/wide-events.md](references/wide-events.md)
- Improving errors → [references/structured-errors.md](references/structured-errors.md)
- Full code review → [references/code-review.md](references/code-review.md)
- Drain pipeline setup → [references/drain-pipeline.md](references/drain-pipeline.md) (generic; this repo has no drain)
