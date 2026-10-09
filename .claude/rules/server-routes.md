---
paths:
  - "server/**"
  - "shared/**"
  - "openapi/**"
---

# Nitro server layer

The Django proxy contract, middleware, plugins, logging and the generated OpenAPI code.

## Backend Communication Pattern

The Nuxt server acts as a **proxy** to the Django backend. Client-side code calls `/api/...` routes on the Nuxt server, which then forwards requests to the Django API (`NUXT_API_BASE_URL`).

- **Server API routes** (`server/api/`): Proxy endpoints organized by domain — products, cart, orders, blog (posts/comments/categories), user (account/addresses), search, loyalty, notifications, subscriptions (topics/user), contact, countries, regions, pay-way, settings, health, websocket
- **Server API pattern**: Routes use `getValidatedQuery`/`readValidatedBody` (from `nuxt/server`, given the Zod schema itself) and `parseRouterParams` for input, `useBackendFetch(event)` to Django, `parseDataAs` for response validation, `handleError(event, error)` for error handling. Cached routes use `defineCachedRoute` (Nitro's cache, SWR) — see "Server code and Nuxt 5".
- **`server/utils/backendFetch.ts`**: every Django call goes through `useBackendFetch(event)` (or `backendFetchFor({ tenantHost, locale })` in a cached function, which has no request): an explicit ofetch instance that adds `X-Forwarded-Proto`, the store's `X-Forwarded-Host`, `X-Language`, the visitor's identity and the correlation id, to Django origins only (`isInternalBackendUrl`). There is no global `$fetch` on the server and nothing patches one.
- **`server/utils/auth.ts`**: Creates forwarding headers (`X-Session-Token`, `Authorization`, `X-Forwarded-Host`) for Django requests; `createHeaders(event, …)` sets `X-Forwarded-Host` to the store the request is for (`requestTenantHost`, never a client-sent `X-Forwarded-Host`); `processAllAuthSession(event, …)` handles token propagation. Every helper takes the request explicitly.
- **`server/utils/tenantHost.ts`**: `server/middleware/0.tenant.ts` resolves the store's host once (`resolveTenantHost`) into `event.context.tenantHost`, before its bypass checks; `requestTenantHost(event)` reads it there, so it serves a route's event and the h3 event Nitro gives cache keys and plugins alike
- **`server/utils/api.ts`**: `createCachedFetcher<T>` for paginated data fetching with caching
- **`server/utils/cartSession.ts`**: Cart session management via `useCartSession(event)` — keeps `cartId` in nuxt-auth-utils' session (the signed-in user's `nuxt-session` cookie, written with the cart's 30-day lifetime) plus a plain `cart-id` spare cookie; provides `getCartHeaders`/`handleCartResponse`/`clearCartSession`; `getCartHeaders` sets `X-Forwarded-Host` the same way as `createHeaders`
- **`server/utils/parser.ts`**: `parseDataAs(data, zodSchema)` for runtime validation of API responses
- **`server/utils/error.ts`**: `handleError(event, error)` (request validation, response contract, Fetch and HTTP errors), `handleAllAuthError(event, error)` (auth-specific errors with session management)
- **`server/utils/oauth.ts`**: Shared OAuth helpers (`captureOAuthProcess`, `readAndClearOAuthProcess`, `storeOAuthTokensAndRedirect`, `redirectOAuthError`) used by Google and Facebook route handlers
- **`app/utils/auth.ts`** (client): `callAuthChangeHook` → `nuxtApp.callHook('auth:change')` — the only path for auth state changes; composable `onResponse`/`onResponseError` interceptors call this
- **Guest order access**: Guest order API calls require a `?uuid=` query parameter for Django's `IsOwnerOrAdminOrGuest` permission check. Server routes under `server/api/orders/[id]/` forward the UUID to the backend.

## Server code and Nuxt 5

Nuxt 5 runs Nitro v3, which has no server auto-imports and no global
`$fetch`. The server is written for it now:

- **Routes and middleware import from `nuxt/server`** (`defineEventHandler`,
  `getValidatedQuery`, `readValidatedBody`, `createError` with
  `status`/`statusText`, `sendRedirect` — which RETURNS the body to respond
  with — `getRouterParam(s)` with `{ decode: true }`, `useRuntimeConfig()`
  without an event) and use web APIs on the event: `event.url`,
  `event.req.method`, `event.req.formData()`, `event.res.headers`.
- **Nitro-only APIs are imported from `nitropack/runtime`** (Nuxt 5 renames
  these to `nitro/*`): `defineNitroPlugin`, `defineCachedFunction`,
  `useStorage`, `useEvent`. Server plugins are Nitro code and use h3's
  helpers on the h3 event Nitro gives their hooks.
- **Cached routes use `defineCachedRoute(handler, options)`**
  (`server/utils/cachedRoute.ts`): Nitro's cache around a `nuxt/server`
  handler. Its `getKey`/`shouldBypassCache` get h3's event: read the query
  with h3's `getQuery`, params with `nuxt/server`'s `getRouterParam(s)`,
  and the store and locale from the context (`tenantCacheKey`).
- **evlog's wide-event logger is `event.context.log`** (typed in
  `shared/types/request-context.d.ts`); evlog's `useLogger` is typed on h3's
  event only.
- **h3 handlers remain only where a module or h3 itself requires them**:
  the OAuth routes (nuxt-auth-utils' factories), the sitemap source,
  the RSS feed, the manifest and `4.tenant-site-config.ts` (nuxt-site-config
  takes h3's event), `1.device-class.ts` (writes a Node request header for
  Nitro's cache `varies`) and `contact/attachment.post.ts` (`proxyRequest`
  streams the upload).
- `test/unit/source-rules/server-imports-are-explicit.spec.ts` fails on any
  h3 or Nitro name used in `server/**` without an import.

## Server Middleware

Numeric prefixes order execution. Request logging is via evlog (there is no `log.ts`).

- `0.markdown-negotiation.ts` — serves the `.md` variant of a route when an AI/agent client negotiates for it (nuxt-ai-ready)
- `0.redirects.ts` — 301 redirect from `www.` to non-www
- `0.tenant.ts` — resolves `event.context.tenant` from the request host (runs first; see Multi-Tenant Architecture)
- `1.ai-ready-gate.ts` — gates the on-demand `.md`/llms routes
- `1.locale.ts` — `event.context.locale` = the page's locale: the path prefix of a page request, or the `X-Language` the app's fetchers state on an `/api` request, clamped by `servedLocale` (`shared/i18n/tenantLocales.ts`). No cookie, `Accept-Language` or `?locale=` source. It is sent to Django as `X-Language` and is part of every `tenantCacheKey`
- `2.evlog-auth.ts` — attaches the auth session user id to the wide event (`useLogger`)
- `3.csp.ts` — per-tenant Content-Security-Policy (extends src lists with the tenant's `allowedCspSources`)
- `4.tenant-site-config.ts` — sets per-tenant `@nuxtjs/seo` site config (url/name)
- `5.tenant-canonical.ts` — canonical host enforcement for the tenant's primary domain
- `6.tenant-favicon.ts` — serves the tenant's favicon

## Server Plugins

- `http-agent.ts` — Undici Agent for connection pooling (100 connections, pipelining 10, keep-alive 30s) — reduces latency for internal API calls
- `edge-cache.ts` — lets Cloudflare cache ONLY the pages Nitro served from its page cache: `Cloudflare-CDN-Cache-Control` (never `s-maxage`, which disables the edge's stale-while-revalidate), `Cache-Control: no-cache` for browsers, and `Cache-Tag: storefront-html,storefront-html-<schema>` — tag names are a contract with Django's `core/cache/edge.py`, which purges them after an edit and after a deploy. Set as the response ENDS, because h3's 304 revalidation is sent from inside Nitro's cached handler. Rules in `server/utils/edgeCache.ts`
- `storage.ts` — Configurable cache backend: tests Redis connectivity, falls back to memory driver if unavailable
- `server/early-plugins/runtime-config.ts` — NOT in `server/plugins/`: registered via `nitro.plugins` in `nuxt.config.ts` so it runs before every module's plugin. Seeds each request's `useRuntimeConfig(event)` with a clone of the boot-resolved config, skipping Nitro 2's per-request env re-walk (63% of a trivial request's CPU, ~19% of a page render). Keep it first; a copy built by an earlier `request` hook makes it a no-op.
- `startup-validation.ts` — Validates required env vars (`NUXT_SESSION_PASSWORD` >= 32 chars) at startup; fails hard on misconfiguration

## Structured Logging (evlog)

Uses `evlog/nuxt` module for structured logging. `log` is auto-imported on both client and server (Nitro).

- **Simple logging**: `log.info('tag', 'message')` (2 args max — evlog ≥2.22 silently drops a third context arg), or the wide-event object form for context: `log.info({ tag: 'tag', message: 'message', ...context })`, `log.error({ action: 'name', error })`
- **Wide events** (server only): `event.context.log?.set({ key: value })` in routes and middleware (evlog's `useLogger(event)` is typed on h3's event, so `nuxt/server` code reads the logger from the context, where evlog puts it) — one rich event per request, auto-emitted at request end
- **What reaches the log line**: only fields set on the request logger BEFORE it emits — `server/middleware/0.tenant.ts` (`tenantSchema`, `tenantName`), `server/middleware/2.evlog-auth.ts` (user id), `server/middleware/2.evlog-client.ts` (`client`: browser + major version, OS name, render `deviceClass`, `bot`, `country`). evlog prints the stdout line (what Vector ships to VictoriaLogs) at emit; `evlog:enrich` hooks run after that and feed drains only, and there is no drain, so never add an `evlog:enrich` hook expecting it in the logs. `silent` + an `evlog:drain` hook is not the way out either: only request events reach that hook, so every other `log.*` line (errors included) would vanish. Never log the raw User-Agent or an OS version (browsers freeze it).
- **Every request is logged** except the assets a page pulls (`evlog.exclude` in `nuxt.config.ts`): page renders and `_payload.json` included. In VictoriaLogs a storefront event's path is its `_msg` (the `VL-Msg-Field` fallback), not a `log.path` field.
- **Sampling**: Production-only via `$production.evlog.sampling` in `nuxt.config.ts`
- **Client-error log level**: evlog logs every *errored* request at `error` level (`level = manualLevel ?? hasError ? 'error' : …`), with no 4xx/5xx distinction — so benign client errors (unknown-route 404s, allauth 401 "not authenticated, here are your flows") drown out real 5xx faults. `server/plugins/evlog-client-error-level.ts` downgrades 4xx → `warn` via a Nitro `error` hook + `useLogger(event).setLevel('warn')` (`isClientError` in `server/utils/http-status.ts`); 5xx stays `error`. 4xx remain visible via the `evlog.sampling.keep: [{ status: 400 }]` rule. Mirrors evlog's own Datadog severity mapping.
- **ESLint**: `no-console: 'error'` enforced — use `log.*` instead of `console.*`
- **Scope limitation**: `log` is NOT auto-imported in `i18n/` directory (outside Nitro/Nuxt auto-import scope)

## Server Routes

- `server/routes/auth/google.get.ts` and `facebook.get.ts` — OAuth callback handlers (store tokens in encrypted session, not URL params)
- `server/api/auth/oauth-params.get.ts` — One-time-use endpoint that reads OAuth params from session and clears them
- `server/routes/rss.xml.get.ts` — RSS feed generation (cached, SWR) combining blog posts and products with media:content, reading time, product pricing/availability
- `server/api/__sitemap__/urls.ts` — Dynamic sitemap URL source for `@nuxtjs/sitemap`

## OpenAPI Type Generation

Types and Zod schemas are auto-generated from the Django backend's OpenAPI schema:
1. `pnpm generate:schema` — fetches `schema.json`/`schema.yml` from Django (needs `DJANGO_API_TOKEN` env var or `.auth-token` file). Reads **`NUXT_DJANGO_URL`** (default `http://localhost:8000`) — point it at LOCAL Django, never prod: prod's `/api/v1/schema` is a subset (255 components vs 271 local) and regenerating from it silently deletes components the frontend uses (`Country`, `BlogAuthor`, `Paginated*List`).
2. `pnpm openapi-ts` — generates `shared/openapi/types.gen.ts` and `shared/openapi/zod.gen.ts` via `@hey-api/openapi-ts`
3. `pnpm sync:schema` — **required, not optional.** `openapi/schema.yml` and the root `schema.yml` are derived from `openapi/schema.json` by `scripts/sync-schema-yml.mjs`. CI's *OpenAPI Schema Freshness* job regenerates them and fails on any diff. Copying Django's `spectacular` YAML across directly also fails it — the YAML dump formatting differs.

Commit `openapi/schema.json`, both `schema.yml` files, and `shared/openapi/*` together. A removed field is the dangerous direction: the committed Zod still marks it `required`, so `parseDataAs` rejects the correctly-absent field with a 422, and only on the one flow returning that nested object.

## Shared Code (`shared/`)

Auto-imported in both app and server contexts (via `imports.dirs` and `nitro.imports.dirs`). Contains:
- `types/` — Hand-written types organized by domain: `body/all-auth/`, `model/all-auth/`, `response/all-auth/`, `error/all-auth/`, plus `pagination.ts`, `search.ts`, `meilisearch.ts`, `LoyaltySettings.ts`, `enum/`, `utility/`
- `schemas/` — Zod validation schemas mirroring the types structure: `body/all-auth/`, `model/all-auth/`, `response/all-auth/`, `error/all-auth/`
- Nothing in `shared/` imports Vue or Nuxt UI (`#ui/types`): Nuxt forbids it, and with typed `$fetch` it pulls the app's whole type graph into the shared context. UI-only types live in `app/types/` (the dynamic form schema, ordering options).
- `openapi/` — Auto-generated `types.gen.ts` and `zod.gen.ts`
- `constants/` — `AuthenticatedRoutes`, `AuthenticatedRoutesSet`, `Flow2path`, `AuthChangeEvent`, `GSIAuthProcess`, `RedirectToURLs`, `Flows`, `AuthenticatorType`, `defaultSelectOptionChoose`
- `utils/` — `error.ts` (error helpers), `html.ts` (HTML processing)
