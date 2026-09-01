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
- **Server API pattern**: Routes use `getValidatedQuery`/`readValidatedBody` with Zod schemas, `$fetch` to Django, `parseDataAs` for response validation, `handleError` for error handling. Many routes use `defineCachedEventHandler` with SWR for caching.
- **`server/utils/auth.ts`**: Creates forwarding headers (`X-Session-Token`, `Authorization`, `X-Forwarded-Host`) for Django requests; `createHeaders` sources `X-Forwarded-Host` from `config.public.djangoHostName` (not the raw request host) so that Django's `ALLOWED_HOSTS` validation passes for internal K8s calls; `processAllAuthSession` handles token propagation
- **`server/utils/api.ts`**: `createCachedFetcher<T>` for paginated data fetching with caching
- **`server/utils/cartSession.ts`**: Cart session management via `useCartSession(event)` — stores `cartId` in http-only session cookies, provides `getCartHeaders`/`handleCartResponse`/`clearCartSession`; `getCartHeaders` includes `X-Forwarded-Host` sourced from `config.public.djangoHostName` for internal K8s calls
- **`server/utils/parser.ts`**: `parseDataAs(data, zodSchema)` for runtime validation of API responses
- **`server/utils/error.ts`**: `handleError` (Zod/Fetch/H3 errors), `handleAllAuthError` (auth-specific errors with session management)
- **`server/utils/oauth.ts`**: Shared OAuth helpers (`captureOAuthProcess`, `readAndClearOAuthProcess`, `storeOAuthTokensAndRedirect`, `redirectOAuthError`) used by Google and Facebook route handlers
- **`app/utils/auth.ts`** (client): `callAuthChangeHook` → `nuxtApp.callHook('auth:change')` — the only path for auth state changes; composable `onResponse`/`onResponseError` interceptors call this
- **Guest order access**: Guest order API calls require a `?uuid=` query parameter for Django's `IsOwnerOrAdminOrGuest` permission check. Server routes under `server/api/orders/[id]/` forward the UUID to the backend.
- **`server/utils/logger.ts`**: `Logger` class that writes error logs to `./logs/` as JSON files

## Server Middleware

Numeric prefixes order execution. Request logging is via evlog (there is no `log.ts`).

- `0.markdown-negotiation.ts` — serves the `.md` variant of a route when an AI/agent client negotiates for it (nuxt-ai-ready)
- `0.redirects.ts` — 301 redirect from `www.` to non-www
- `0.tenant.ts` — resolves `event.context.tenant` from the request host (runs first; see Multi-Tenant Architecture)
- `1.ai-ready-gate.ts` — gates the on-demand `.md`/llms routes
- `1.locale.ts` — Locale detection: query param → i18n cookies → Accept-Language header → tenant defaultLocale → `event.context.locale`
- `2.evlog-auth.ts` — attaches the auth session user id to the wide event (`useLogger`)
- `3.csp.ts` — per-tenant Content-Security-Policy (extends src lists with the tenant's `allowedCspSources`)
- `4.tenant-site-config.ts` — sets per-tenant `@nuxtjs/seo` site config (url/name)
- `5.tenant-canonical.ts` — canonical host enforcement for the tenant's primary domain
- `6.tenant-favicon.ts` — serves the tenant's favicon

## Server Plugins

- `http-agent.ts` — Undici Agent for connection pooling (100 connections, pipelining 10, keep-alive 30s) — reduces latency for internal API calls
- `storage.ts` — Configurable cache backend: tests Redis connectivity, falls back to memory driver if unavailable
- `startup-validation.ts` — Validates required env vars (`NUXT_SESSION_PASSWORD` >= 32 chars, `NUXT_SECRET_KEY`) at startup; fails hard on misconfiguration

## Structured Logging (evlog)

Uses `evlog/nuxt` module for structured logging. `log` is auto-imported on both client and server (Nitro).

- **Simple logging**: `log.info('tag', 'message')` (2 args max — evlog ≥2.22 silently drops a third context arg), or the wide-event object form for context: `log.info({ tag: 'tag', message: 'message', ...context })`, `log.error({ action: 'name', error })`
- **Wide events** (server only): `const wideLog = useLogger(event)` → `wideLog.set({ key: value })` — one rich event per request, auto-emitted at request end
- **Enrichers**: `server/plugins/evlog-enrichers.ts` (user-agent, geo, request size, trace context), `server/middleware/2.evlog-auth.ts` (auth session user ID via `useLogger`)
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
- `types/` — Hand-written types organized by domain: `body/all-auth/`, `model/all-auth/`, `response/all-auth/`, `error/all-auth/`, plus `pagination.ts`, `ordering.ts`, `search.ts`, `form.ts`, `meilisearch.ts`, `LoyaltySettings.ts`, `enum/`, `utility/`
- `schemas/` — Zod validation schemas mirroring the types structure: `body/all-auth/`, `model/all-auth/`, `response/all-auth/`, `error/all-auth/`, plus `form.ts`
- `openapi/` — Auto-generated `types.gen.ts` and `zod.gen.ts`
- `constants/` — `AuthenticatedRoutes`, `AuthenticatedRoutesSet`, `Flow2path`, `AuthChangeEvent`, `GSIAuthProcess`, `RedirectToURLs`, `Flows`, `AuthenticatorType`, `defaultSelectOptionChoose`
- `utils/` — `error.ts` (error helpers), `html.ts` (HTML processing)
