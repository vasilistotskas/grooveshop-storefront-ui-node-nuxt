# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nuxt 4 SSR e-commerce storefront (Vue 3 Composition API, TypeScript) that communicates with a Django REST API backend. Uses `@nuxt/ui` v4 for the component library, Pinia for state management, and `@nuxtjs/i18n` for internationalization (`el` default, plus `en`). The Vue Options API is disabled — all components use `<script setup lang="ts">`.

## Detailed guidance lives in `.claude/rules/`

This file holds what is true in every session. Area-specific detail sits in
path-scoped rules that load automatically the moment Claude touches a matching
file, so a styling task never pays for the tenant contract and vice versa. Read
one directly when you need it before touching those files.

| Rule | Loads when you touch | Covers |
|---|---|---|
| `.claude/rules/server-routes.md` | `server/**`, `shared/**`, `openapi/**` | The 4-step Django proxy contract, middleware, plugins, evlog, generated OpenAPI code |
| `.claude/rules/multi-tenant.md` | `server/**`, `app/stores/**`, `app/composables/**`, `nuxt.config.ts` | Tenant resolution, `event.context.tenant`, `tenantCacheKey`, hydration order |
| `.claude/rules/auth.md` | the allauth / session / OAuth files | The two-token allauth + Knox model |
| `.claude/rules/ui-and-pages.md` | `app/components/**`, `app/layouts/**`, `app/pages/**`, `app/middleware/**` | Component categories, styling, images, routing, SEO and performance |
| `.claude/rules/testing.md` | `test/**`, `*.spec.ts`, `vitest.config.mts` | Vitest projects and the Nuxt test-environment traps |

**The trigger is the Read tool, not any file access.** Opening a file with
`cat`/`head`/`sed` through Bash does *not* load the matching rule — verified on
v2.1.252. If you are working through shell commands, or you need a rule before
touching its files, read the rule file directly.

## Commands

- **Dev server:** `pnpm dev`
- **Build:** `pnpm build`
- **Lint (with auto-fix):** `pnpm lint`
- **Lint (CI, cached):** `pnpm lint:ci`
- **Type check:** `pnpm typecheck` (= `nuxt typecheck`). This is the gate — it catches template errors `vue-tsc --noEmit` misses, notably Nuxt UI v4 typing `UButton`'s `onClick` as `(e: MouseEvent) => void | Promise<void>`, which rejects an inline `@click="open = true"` (the expression returns boolean). Use a block-bodied arrow: `@click="() => { open = true }"`.
- **Run all tests:** `pnpm test`
- **Run CI tests (unit + nuxt with coverage):** `pnpm test:ci`
- **Run a single test file:** `pnpm vitest run test/unit/app/utils/str.spec.ts`
- **Run a single test project:** `pnpm vitest run --project=unit` or `--project=nuxt`
- **Generate OpenAPI types:** `pnpm openapi-ts` (requires `openapi/schema.json` — fetch with `pnpm generate:schema`), then **`pnpm sync:schema`, which is required, not optional** — it regenerates the derived `.yml` files and CI fails on any diff. See `.claude/rules/server-routes.md`.
- **Prepare Nuxt types:** `pnpm prepare`
- **Build + start production:** `pnpm build && pnpm start`
- **Docker build:** `docker build -f docker/Dockerfile .`
- **Analyze bundle:** `pnpm exec nuxt analyze`. Its `renderedLength` is the
  module's size **before minification** ([rollup-plugin-visualizer uses
  rollup's rendered module code](https://github.com/btd/rollup-plugin-visualizer);
  only `sourcemap: true` gives post-minify sizes), and the treemap covers the
  whole build graph rather than what one page downloads. Both make it a guide
  to *what* is in the bundle, never to *how many bytes* a route costs —
  2026-09-21 it named three modules as the product page's biggest, and none of
  the three was on that page at all. Confirm against the deployed files before
  acting on a number: count the page's scripts and their bytes from the
  browser, or grep the served chunk for a marker unique to the module.
- **Package manager:** pnpm — the exact version is pinned in the `packageManager` field of `package.json`; read it there rather than trusting a number written here

## Architecture

### Directory Layout (Nuxt 4 `app/` convention)

- `app/` — Client-side: components, pages, composables, stores, plugins, middleware, layouts, utils, providers, assets
- `server/` — Nitro server: API proxy routes, middleware, plugins, utils
- `shared/` — Auto-imported in both app and server: types, constants, schemas (Zod), utils, OpenAPI generated code
- `modules/` — Custom Nuxt modules (`cookies.ts` for cookie consent, `purge-comments.ts` removes HTML comments in prod, `font-stacks.ts` compiles the tenant-selectable font stacks)
- `runtime/` — Runtime code for the custom cookie control module (plugin, methods, types, utils)
- `i18n/` — Locale config (`locales.ts` exports `SUPPORTED_LOCALES = ['el', 'en']` and `DEFAULT_LOCALE = 'el'`), i18n config, and a translation file set per locale (`el-GR.json` / `en-US.json`, plus domain-specific: auth, breadcrumb, checkout, cookies, validation). Routes for **both** locales are generated at build time for every tenant; whether one is *reachable* is per-tenant (`Tenant.available_locales`), enforced by `app/middleware/locale-available.global.ts`, which 404s a prefix the tenant does not list
- `openapi/` — Schema files (`schema.json`, `schema.yml`) fetched from Django for type generation
- `scripts/` — `fetch-schema.mjs` (download the OpenAPI schema from Django), `sync-schema-yml.mjs` (regenerate the derived `.yml`), `check-lockstep-deps.mjs`, `audit-visual.mjs`, `capture-ssr.mjs` + `diff-ssr.mjs` (capture a tenant's SSR HTML before/after a change and diff it with build hashes, nonces, generated ids and Cloudflare rewrites normalised — the webside freeze proof; two same-build captures diff to nothing; check the captures are real pages first, a capture of "Store not found" diffs to nothing too), `warm-cache.mjs` (the post-deploy cache warm-up; shipped in the image and run by the infrastructure's PostSync hook: every store's sitemap, plus each page's twin in the store's other locales, × device class, page and, where Nuxt extracts one, `_payload.json` (`hasExtractedPayload`); once per build, recorded in a ConfigMap the infrastructure names)

### State Management

Pinia stores in `app/stores/`:
- `auth` — Session, config, authenticators, 2FA state, social providers, has_usable_password detection
- `cart` — Cart items, totals, stock validation (out-of-stock, limited stock detection, stock status messages)
- `user` — User account data, addresses, favorites, reviews, orders
- `user-notification` — The account notification list (the unseen count lives in `useUserNotification`)
- `tenant` — the resolved `TenantConfig` (hydrated by the `tenant` plugin; see `.claude/rules/multi-tenant.md`)

### Key Composables

50+ composables in `app/composables/` following `use[Feature].ts` naming. Key ones for cross-cutting concerns:
- `setups.ts` — `setupPageHeader` (SEO), `setupGoogleAnalyticsConsent`/`setupMetaPixelConsent`/`setupTikTokPixelConsent` (GDPR-gated, tenant-only ids — no platform/env fallback), `setupCursorState`, `setupSocialLogin` (GSI one-tap)
- `useMediaStreamImage.ts` — `useMediaStreamBaseUrl`/`useMediaStreamImage`/`useMediaStreamSrc`: tenant-aware Media Stream origin resolution (see Image Handling)
- `useAllAuthAuthentication.ts` / `useAllAuthAccount.ts` / `useAllAuthSessions.ts` — Auth flows
- `useCheckout.ts` — Stock reservation and release, cart payment intent (payment-status polling lives in `Storefront/CheckoutSuccess.vue`)
- `useProductFilters.ts` — Product filtering with URL state
- `useLoyalty.ts` — Loyalty program data (summary, transactions, tiers, product points); `useLoyaltySettings.ts` — the programme's figures (ratio, points factor, expiry, bonus, XP per level) parsed from the one `useStoreSettings` payload, `null` when unreadable (no request, no default); whether it is on is `useStoreFeature('loyalty')`
- `useCookieControl.ts` — GDPR cookie consent management

### App Utilities (`app/utils/`)

Utility modules in `app/utils/`. Key: `auth.ts` (client-side auth helpers), `translate.ts` (`extractTranslated` for parler model translations), `error.ts` (client error handling), `componentRegistry.ts` (page-builder sections, `<type>@<schema>` variants), `variantRegistry.ts` (`resolvePage`/`resolveChrome`/`resolveLayout` — every `app/pages/**.vue` is a thin shell that mounts a body from `app/components/Storefront/` or a tenant's `app/components/variants/<schema>/`; see `.claude/rules/ui-and-pages.md`).

### Nuxt Modules

Active modules in `nuxt.config.ts` (the `modules` array, in order):
1. `evlog/nuxt` — Structured logging (`log` auto-import on client + Nitro; see Structured Logging)
2. `@comark/nuxt` — Markdown rendering (used by blog/CMS content)
3. `@nuxt/image` — Image optimization with IPX + custom mediaStream provider
4. `@nuxt/ui` — Component library (v4, with experimental component detection)
5. `@nuxt/eslint` — ESLint integration with checker enabled
6. `@nuxt/scripts` — Third-party script management (Stripe registry)
7. `@nuxt/fonts` — Font optimization
8. `@nuxt/icon` — Icon system (server bundle: icon JSON inlined for the installed collections; client bundle: scanned, with a hard size limit — see `icon` in `nuxt.config.ts`)
9. `@nuxtjs/i18n` — Internationalization (browser detection, cookie-based, typed pages)
10. `@nuxtjs/leaflet` — Leaflet maps (locker/pickup-point selection)
11. `@nuxtjs/seo` — SEO suite: robots, sitemap, OG image (disabled), Schema.org, link checker, SEO utils, site config, and **AI Ready**, which it installs (`nuxt-ai-ready` is no longer a module or dependency of ours). AI Ready serves `/llms.txt`, `/llms-full.txt` and on-demand `/<route>.md` under the `aiReady` key: `database: false` (no page store, so no `drizzle-orm`), `contentNegotiation: false` (`server/middleware/0.markdown-negotiation.ts` does the `Accept: text/markdown` negotiation, which the module's cannot do on our cached routes), `autoI18n: false`, `agentSkills: false`, and `runtimeSync`/`cron` off. `skewProtection: false` turns off the other module it installs. `robots` is configured explicitly in `nuxt.config.ts`.
12. `@pinia/nuxt` — Pinia state management
13. `@vueuse/nuxt` — VueUse composables (device detection via `useMediaQuery` with UA-based SSR width)
14. `nuxt-auth-utils` — Session management

Conditionally pushed (NOT active in production):
- `@nuxt/test-utils/module` — only when `NODE_ENV === 'test'`
- `@nuxt/a11y` — only when `NODE_ENV === 'development'` (accessibility auditing, alpha)

Custom local modules:
- `modules/cookies.ts` — Cookie consent (GDPR categories: necessary, functionality, ad, analytics, personalization, security)
- `modules/purge-comments.ts` — Removes HTML comments in production
- `modules/font-stacks.ts` — Compiles each selectable font stack into the global CSS as `--font-stack-<key>`, where `@nuxt/fonts` adds its metric-matched fallback faces; tenant tokens point at it (`fontStackValue`), and `server/plugins/tenant-fonts.ts` drops the `@font-face` rules of every family the store does not set

### CI/CD

- **GitHub Actions CI** (`.github/workflows/ci.yml`): quality (TypeScript check, dependency audit) → test (unit+nuxt with coverage) → build (with Redis 8 service, .env from GitHub vars/secrets) → release (semantic-release on `main` push — versions, CHANGELOG, GitHub Release; **no npm publishing**). All steps use Node 24.x and pnpm with frozen lockfile. A push to `main` whose tree a green pull_request run already tested (the branch was up to date with `main`) skips everything but Trivy and releases at once (`.github/scripts/tested_in_pr.sh`), except Build when `main` has no fonts cache for the tree (only Build saves the one the image build restores); merging a branch that is behind `main` costs a full second run. The image build (`docker.yml`) uses no BuildKit layer cache: it runs on a release tag, and no tag can read another tag's cache.
- **Docker publish** (`.github/workflows/docker.yml`): On GitHub release `published`, builds a multi-stage Docker image (Node 24 Alpine) and pushes to Docker Hub (`gro0ve/grooveshop-storefront-ui-node-nuxt`) and GHCR. Uses Docker Buildx without a layer cache (see the CI note above).
- **Semantic release**: Conventional commits, auto-versioning, CHANGELOG generation, GitHub release with `.output` asset. Publishing to npm is disabled (`npmPublish: false`); the `@semantic-release/npm` plugin only bumps `package.json` version.
- **Docker** (`docker/Dockerfile`): Multi-stage build. Build stage installs deps with pnpm cache mount, prepares Nuxt, builds with `NODE_OPTIONS=--max-old-space-size=8192`. Production stage copies only `.output`, runs as non-root `node` user.

## Conventions

- **Component structure**: `<script setup lang="ts">` → Types → Props → Composables → Constants → Computed → Methods → Lifecycle, then `<template>`, then `<style scoped>` (prefer Tailwind classes). Supports generics: `<script lang="ts" generic="T extends string | number">`
- **Naming**: Components PascalCase, files kebab-case, functions camelCase, constants UPPER_SNAKE_CASE, types/interfaces PascalCase, composables `use[Feature].ts`, custom events kebab-case
- **Linting**: ESLint via `@nuxt/eslint` with stylistic rules + `eslint-plugin-better-tailwindcss` (with NuxtUI class ignores). Key relaxed rules: `no-explicit-any: off`, `ban-ts-comment: off`, `vue/no-v-html: off`, `vue/multi-word-component-names: off`, `vue/attribute-hyphenation: off`, `nuxt/prefer-import-meta: off`. Warns on: `vue/no-watch-after-await`, `vue/no-lifecycle-after-await`, unknown Tailwind classes.
- **TypeScript**: Strict mode with type checking enabled. Typed pages (`experimental.typedPages: true`). `RouteNamedMapI18n` used for type-safe route names. Vite hoisted.
- **Releases**: Semantic release on `main` branch with conventional commits (e.g., `feat:`, `fix:`, `chore:`)
- **API route pattern**: Validate input with Zod → `useBackendFetch(event)` to Django → `parseDataAs` response → `return handleError(event, error)` in catch (`.claude/rules/server-routes.md`). `handleError` returns an upstream 4xx's body verbatim (so `error.data` is Django's body on the client, one shape for every route) and throws everything else, so it is always `return`ed (`test/unit/source-rules/handle-error-is-returned.spec.ts`) and nothing follows it. Use `throw createError(...)` not `return createError(...)`.
- **Zod version**: Zod 4 (import from `zod`, schemas prefixed with `z`)
- **App fetchers**: the app calls its own `/api` ONLY through `$api` (for `$fetch`), `useApi` / `useLazyApi` (for `useFetch` / `useLazyFetch`) and `useRequestApi` (for `useRequestFetch`) — `app/utils/api.ts`, `app/plugins/api.ts`, `app/composables/useApi.ts`. They state the page's locale in `X-Language` (`pageLocaleHeader`), which is the language Django answers in and what the Nitro caches key on; an ESLint `no-restricted-syntax` rule fails a raw `$fetch` / `useFetch` / `useLazyFetch` / `useRequestFetch` in `app/**`. Tests mock `$api` / `useApi` with `mockNuxtImport`. A component or page handles a failed `$api` call in `try` / `catch` / `finally`, never in ofetch's `onResponse*` hooks: ofetch runs them and THEN rejects, and UButton / UForm hand that rejection to Vue's error handler (`test/unit/source-rules/api-errors-are-caught.spec.ts`). On the server `useApi`/`useLazyApi` fetch a key ONCE per render however many readers it has (`app/utils/serverRenderCachedData.ts`: Nuxt's default refetches for every reader that registers after the first fetch settled); a raw `useAsyncData` must spread `serverRenderCachedData()` and set `dedupe: 'defer'` itself. Readers of one key must pass identical options, so a key read from several places gets ONE composable (`useStoreSettings`, `useAllCategories`). A request a condition gates (a feature flag, a signed-in shopper, a query to search for) passes it as `enabled`, never `immediate: <condition>`: `immediate` skips only the first fetch, and a reactive query or body still refetches; `enabled` blocks every run (an ESLint `no-restricted-syntax` rule fails the `immediate` form).
- **Store actions**: Must use `$api`, not `useApi` (which is a setup-scope composable). `useLazyApi` should not be `await`ed in `<script setup>` — it defeats lazy loading.
- **SSR safety**: Use VueUse `useEventListener` instead of manual `window.addEventListener`/`removeEventListener`. Guard bare `window`/`document` access with `import.meta.client` or `onMounted`.
- **Lifecycle hooks**: Vue does not await async lifecycle hooks. Use fire-and-forget with `.catch()` for cleanup work in `onBeforeUnmount`.
- **i18n**: All user-facing strings must use `t()` from `useI18n()` or component-scoped `<i18n lang="yaml">` blocks — no hardcoded Greek or English strings. Use `extractTranslated(obj, field, locale)` for API model translations: it reads the row in the page's language when the row is written in it, else in the store's default language (`TenantConfig.defaultLocale`), else in any it has, so an untranslated product is never blank; the Django `translations` map itself stays exact, because it names the languages a page exists in (`translatedLocales`). `resolveTranslated` when the caller needs the locale it got; `translationIn` for the exact read.

## Environment

Copy `.env.example` to `.env`. Key variables:
- `NUXT_API_BASE_URL` — Django API URL (default `http://localhost:8000/api/v1`)
- `NUXT_DJANGO_URL` — Django base URL
- There is deliberately **no env var naming a store.** Which tenant is the platform's own storefront (the one that renders the brand assets bundled under `public/`) is the `TenantConfig.isPlatformStorefront` row flag from `/tenant/resolve`, read through `useTenantStore().isPlatform` / `useIsPlatformTenant()` (app) and `isPlatformTenantConfig(tenant)` (server). The author and site-verification meta are per-store fields on the same payload (`seoAuthor`, `googleSiteVerification`, `pinterestDomainVerify`).
- `NUXT_PUBLIC_BASE_URL` — Platform-neutral storefront URL used only when no tenant is resolved (default `http://localhost:3000`). Every `NUXT_PUBLIC_*` value is serialized into every tenant's HTML, so none of them may carry a store's own hostname, title or logo — that is what put the first store's data in other tenants' DOM.
- `NUXT_PUBLIC_DJANGO_HOST_NAME` — Platform Django hostname (production: the public-schema host `platform.grooveshop.space`); the WebSocket host when the tenant has no `apiDomain` (`app/plugins/websocket.client.ts`), and the CSP `connect-src` API host when no tenant is resolved (`server/middleware/3.csp.ts`). It is never an `X-Forwarded-Host`: every Django call names its store with `requestTenantHost(event)`, or the `tenantHost` a cached function passes to `backendFetchFor`. With a tenant resolved, every browser-facing use (WebSocket, social-login redirect, CSP, CMS image allowlist) takes `TenantConfig.apiDomain` instead; the social-login redirect and the CMS image allowlist fall back to `NUXT_PUBLIC_DJANGO_URL`, not this.
- `NUXT_PUBLIC_MEDIA_STREAM_ORIGIN` / `NUXT_PUBLIC_MEDIA_STREAM_PATH` — Media processing service
- `NUXT_PUBLIC_STATIC_ORIGIN` — Static file origin (Django)
- `NUXT_PUBLIC_CARTO_BASEMAPS_KEY` — one platform key for CARTO's basemap tiles (checkout locker map, store-location section; `shared/utils/carto-basemaps.ts`). Public by design (CARTO restricts it by Referer, not secrecy), never per-tenant. Empty means no map renders — CARTO serves a watermarked tile for a keyless request, so there is no fallback.
- `NUXT_CACHE_PURGE_TOKEN` — shared secret for the `/api/admin/cache/purge` route (`runtimeConfig.cachePurgeToken`); Django's Cache Management admin sends it to invalidate the Nitro SSR cache
- `NUXT_CACHE_BASE` — `redis` or `memory`
- `NUXT_REDIS_HOST` / `NUXT_REDIS_PORT` / `NUXT_REDIS_TTL` / `NUXT_REDIS_PASSWORD` / `NUXT_REDIS_DB` — Redis config
- `NUXT_SESSION_PASSWORD` — Session encryption password
- `NUXT_OAUTH_GOOGLE_*` / `NUXT_OAUTH_FACEBOOK_*` — the two providers the storefront signs in itself (`server/routes/auth/`), read from `process.env` at request time so no build bakes them into `.output`. GitHub and Discord sign-in is Django's alone: the browser is redirected through allauth, which holds their credentials (`tenant/allauth_adapter.py`), and the storefront has none
- `NUXT_SITE_URL` / `NUXT_SITE_NAME` / `NUXT_SITE_DESCRIPTION` / `NUXT_SITE_DEFAULT_LOCALE` — SEO site config

Google Analytics tracking id, Meta/TikTok Pixel ids, social media links, the Stripe publishable key, and the BoxNow partner id are **tenant-only** (`TenantConfig.gaTrackingId`/`metaPixelId`/`tiktokPixelId`/`socials*`/`stripePublishableKey`/`boxNowPartnerId` via `useTenantStore()`) — no platform/env fallback. Each merchant provisions its own; there is deliberately no `NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID`/`NUXT_PUBLIC_META_PIXEL_ID`/`NUXT_PUBLIC_TIKTOK_PIXEL_ID`/`NUXT_PUBLIC_SOCIALS_*`/`NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`/`NUXT_PUBLIC_BOXNOW_PARTNER_ID` env var. Stripe-unconfigured tenants never reach the payment UI (pay-way gating hides it); `StripePayment.vue` still degrades gracefully (shows `stripe_init_error`) if it ever runs with an empty key.
