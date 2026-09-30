---
paths:
  - "test/**"
  - "vitest.config.mts"
  - "**/*.spec.ts"
---

# Testing

How the suite is laid out, the rules every spec follows, and the traps that
cost the most time. `vitest.config.mts` and the helpers it names are the
source of truth; each helper documents itself in its own JSDoc.

## Projects

| Project | Specs | Environment | For |
|---|---|---|---|
| `unit` | `test/unit/**/*.spec.ts` | `node` | Pure logic: `app/utils`, `shared/**`, the whole Nitro server, source rules, fixture contracts |
| `nuxt` | `test/nuxt/**/*.spec.ts` | `nuxt` (happy-dom) | Code that needs the Nuxt runtime: components, composables, stores, middleware, plugins, pages |
| `e2e` | `test/e2e/**/*.spec.ts` | `node` | A real Nitro dev server driven over HTTP |

- Only `*.spec.ts` runs. A file named anything else under `test/` is a helper
  or a suite module (`test/e2e/pageRenders.ts` is imported by
  `test/e2e/storefront.spec.ts`).
- Files run **in parallel** in `unit` and `nuxt`, with **no retries** and the
  default 5s test timeout. A test that needs a retry or a longer budget is
  wrong; find the race or the real sleep.
- `e2e` is serial (`fileParallelism: false`): Nuxt allows one dev server per
  project directory, so every e2e suite shares the single boot in
  `storefront.spec.ts`. Add a suite by adding a module there.
- **Where a spec goes** — the path mirrors the source:
  `app/utils/str.ts` → `test/unit/app/utils/str.spec.ts`,
  `shared/utils/csp.ts` → `test/unit/shared/utils/csp.spec.ts`,
  `server/api/orders/index.post.ts` → `test/unit/server/api/orders/index.post.spec.ts`,
  `app/components/Checkout/Sidebar.vue` → `test/nuxt/components/Checkout/Sidebar.spec.ts`.
  One spec per source file. Put code in `test/nuxt` only if it needs the Nuxt
  runtime; extract a pure function into `app/utils` or `shared/utils` rather
  than boot Nuxt to test arithmetic.

## Isolation (every project)

`mockReset`, `restoreMocks`, `unstubGlobals` and `unstubEnvs` are on. Before
every test, call history and implementations are reset (`vi.fn(impl)` goes
back to `impl`), spies are restored, and `vi.stubGlobal` / `vi.stubEnv` are
undone. So:

- Anything a whole file needs (`mockImplementation`, `mockReturnValue`,
  `vi.stubGlobal`, `routes(...)`) goes in `beforeEach`, never at module scope.
- A hoisted `vi.fn(() => Promise.resolve({}))` default survives the reset;
  that is how boot-safe mocks work.
- Reset module state the code keeps: `clearNuxtData(key)` for `useApi`
  caches, a fresh Pinia for direct store tests, and the tenant cache (the
  unit setup file clears it for server specs).
- Pin time for anything date-dependent: `vi.useFakeTimers({ toFake: ['Date'] })`
  + `vi.setSystemTime(...)`. An unpinned "30 days from now" failed on every
  30th of the month.

## No real sleeps

Never `await new Promise(r => setTimeout(r, N))`. Use `flushPromises()` for
resolved mocks, `vi.waitFor(() => expect(...))` for work you cannot await,
and fake timers for debounce, polling and timeouts
(`vi.useFakeTimers({ toFake: [...] })`, `await vi.advanceTimersByTimeAsync(ms)`,
`vi.useRealTimers()` in `afterEach`).

## What a test must do

- **Fail when the behaviour breaks.** No `toBeDefined()` / `exists()` /
  `typeof === 'function'` smoke tests, no assertions on the test's own
  literals or on a mock echoing itself, no `>= 0`, no conditional `expect`.
  A spec that re-implements the logic it claims to test tests nothing — 26
  such files (8.6k lines) were deleted on 2026-09-30.
- **Prove new tests** by breaking the guarded source line, watching the test
  fail, and reverting — in ONE command, so no other run ever sees the
  mutated file.
- **Assert behaviour, not internals.** Query by role, accessible name, text,
  `aria-*`; drive with `setValue` / `trigger`; assert rendered output,
  emitted events, and the requests made (URL, method, body/query).
  `wrapper.vm` only for a `defineExpose` contract; a class string only when
  the class is the contract, with a comment saying why.
- **Build data from fixtures**, never partial objects cast through
  `unknown`.

## The kit

| Path | What |
|---|---|
| `test/helpers/api.ts` | `createApiMock()` for `$api` / `$fetch` / `useRequestApi`: boot-safe default, `create()`, `routes()` (exact path by default, `'/prefix/*'` for prefix), `callsTo()` |
| `test/helpers/asyncData.ts` | `createAsyncDataMock()` shaped like Nuxt's `AsyncData` |
| `test/helpers/tenant.ts` | `setTenant(overrides)` on the active Pinia's tenant store |
| `test/helpers/trees.ts` | `trees(Default, Webside)` for running one spec body over both component trees |
| `test/helpers/sourceText.ts` | the source-rule toolkit: file walks, memoised SFC/AST parsing, `classesOf`, `componentName` |
| `test/helpers/nitro/` | the server harness (below) |
| `test/helpers/e2e.ts` | dev-server boot, fake Django, `requestWithHost` |
| `test/fixtures/*.ts` | `makeProduct`, `makeCart`, `makeCartItem`, `makePayWay`, `makeCountry`, `makeUserDetails`, `validTenantConfig`, … |

Every fixture factory's defaults are strict-parsed against the generated Zod
schema in `test/unit/fixtures/*.spec.ts`, so a schema change fails there in
milliseconds, naming the field. Add a factory the same way instead of
hand-building a payload in a second spec.

## `nuxt` project traps

- **Auto-imports are real imports here.** Mock them with `mockNuxtImport`
  (module scope, once per name per file — it is a macro turned into a hoisted
  `vi.mock`; per-test behaviour through `vi.hoisted` mocks). `vi.stubGlobal`
  and `vi.mock('#app')` do not reach auto-imports; they silently mock nothing.
- **App code fetches through `$api` / `useApi` / `useLazyApi` /
  `useRequestApi`.** `useApi` transports through Nuxt's `$fetch`, so a spec
  whose `useApi` answers come from the api mock mocks `$fetch` too:
  ```ts
  const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
  mockNuxtImport('$api', () => api)
  mockNuxtImport('$fetch', () => api)
  ```
  **Mocking `$fetch` shadows every `registerEndpoint` in the file** — pick one
  mechanism per spec. (That trap once left four frozen-render snapshots
  pinning empty output.)
- **`clearNuxtData()` with no key only clears keys that already have a
  payload entry.** A request still in flight survives it, and a
  `dedupe: 'defer'` reader then joins the stale promise. Clear by key
  (`clearNuxtData(['store-settings', ...])`) when a spec changes what an
  endpoint serves between renders.
- **`mountSuspended(C, { route: false })`** unless the test reads the route;
  the first mount per file is paid by `test/fixtures/setup/nuxt.ts`, which
  also unmounts every wrapper after each test (`enableAutoUnmount`).
- **Call composables before the first `await`** in an async `setup`.
- **Router mocks need the full surface** (`beforeResolve`, `onError`,
  `isReady`, `resolve`, …) or app initialisation breaks.
- **i18n returns real Greek.** For exact copy assert
  `useNuxtApp().$i18n.t('key', params)` rather than hardcoding the string.

## `unit` project: the server harness

The unit project resolves auto-imports the way the Nitro build does
(`vitest.config.mts`): source under `server/`, `shared/` and `app/utils/` gets
the real h3, `server/utils`, `shared` and `app/utils` exports. Nitro's runtime
and module helpers, which cannot load outside a build, resolve to the typed
shim in `test/helpers/nitro/runtime.ts`; `test/helpers/nitro/imports.ts` is
the one list of names it provides. Test files are never transformed — they
import what they use.

- Drive a route with `callRoute(handler, { url, method, headers, body, route })`:
  real h3 app and router, real params, status, headers and error mapping.
- Mock only boundaries: the backend (`backend.reply(...)`, the spy behind the
  real ofetch `$fetch` / `useBackendFetch`), `getTenantConfig` via
  `vi.mock('~~/server/utils/tenant')`, Redis, time. Keep `parseDataAs`, the
  generated schemas, `tenantCacheKey`, `createHeaders`, `handleError` and every
  h3 helper real.
- A cached handler runs on Nitro's varies-only event, as in production:
  reading a header that is not in `varies` fails in the test too.
- `test/unit/server/cached-handlers.spec.ts` holds the cache-key contract for
  every `defineCachedEventHandler` route (two hosts, two locales, a spoofed
  `X-Forwarded-Host`). A new cached route is covered automatically; do not add
  per-route "two tenants differ" copies.
- A `ReferenceError` in a server spec means a module added an auto-import the
  shim does not provide: add it to `imports.ts` and `runtime.ts`, mirroring
  the real implementation.

## The frozen webside tree

A component whose default and `variants/webside` copies share their logic
gets one spec body run over both, via `describe.each(trees(Default, Webside))`;
genuine differences are named with `it.runIf(tree === …)`. When the default is
rewritten for real, fork its body into a default-only suite and keep the
webside row. `test/nuxt/variants/webside/frozen-render.spec.ts` pins the
frozen tree's markup; its snapshots change only when webside is meant to
change.

## Source rules

`test/unit/source-rules/` holds invariants that are properties of the source
(a class pairing, a banned wrapper, component wiring), built on
`test/helpers/sourceText.ts`. Prefer an ESLint rule when the invariant is a
syntax pattern (`eslint.config.mjs` already bans `LazyUDropdownMenu`, an
un-awaited `usePageConfig`, and page macros in components). A rule that
inspects a finite set of sites needs a canary asserting it still matches at
least N of them, so it cannot go blind silently.

## Commands

- One file: `pnpm vitest run test/unit/app/utils/str.spec.ts`
- One project: `pnpm vitest run --project=unit` (or `nuxt`)
- CI's run: `pnpm test:ci` (unit + nuxt with coverage); e2e: `pnpm test:e2e`
