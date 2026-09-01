# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nuxt 4 SSR e-commerce storefront (Vue 3 Composition API, TypeScript) that communicates with a Django REST API backend. Uses `@nuxt/ui` v4 for the component library, Pinia for state management, and `@nuxtjs/i18n` for internationalization (only Greek `el` locale is active). The Vue Options API is disabled — all components use `<script setup lang="ts">`.

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
- **Run a single test file:** `pnpm vitest run test/unit/utils/str.spec.ts`
- **Run a single test project:** `pnpm vitest run --project=unit` or `--project=nuxt`
- **Generate OpenAPI types:** `pnpm openapi-ts` (requires `openapi/schema.json` — fetch with `pnpm generate:schema`)
- **Prepare Nuxt types:** `pnpm prepare`
- **Build + start production:** `pnpm build && pnpm start`
- **Docker build:** `docker build -f docker/Dockerfile .`
- **Analyze bundle:** `npx nuxt analyze`
- **Package manager:** pnpm 11 (pinned in the `packageManager` field)

## Architecture

### Directory Layout (Nuxt 4 `app/` convention)

- `app/` — Client-side: components, pages, composables, stores, plugins, middleware, layouts, utils, providers, assets
- `server/` — Nitro server: API proxy routes, middleware, plugins, utils
- `shared/` — Auto-imported in both app and server: types, constants, schemas (Zod), utils, OpenAPI generated code
- `modules/` — Custom Nuxt modules (`cookies.ts` for cookie consent, `purge-comments.ts` removes HTML comments in prod)
- `runtime/` — Runtime code for the custom cookie control module (plugin, methods, types, utils)
- `i18n/` — Locale config (`locales.ts` exports `SUPPORTED_LOCALES`/`DEFAULT_LOCALE`), locale detector, i18n config, and translation files (el-GR primary, plus domain-specific: auth, breadcrumb, cookies, validation). Only `el` locale exists/is active
- `openapi/` — Schema files (`schema.json`, `schema.yml`) fetched from Django for type generation
- `scripts/` — `fetch-schema.mjs` for downloading OpenAPI schema from Django

### State Management

Pinia stores in `app/stores/`:
- `auth` — Session, config, authenticators, 2FA state, social providers, has_usable_password detection
- `cart` — Cart items, totals, stock validation (out-of-stock, limited stock detection, stock status messages)
- `user` — User account data, addresses, favorites, reviews, orders
- `user-notification` — Notification state, unseen count
- `app` — Global UI state, health check

### Key Composables

50+ composables in `app/composables/` following `use[Feature].ts` naming. Key ones for cross-cutting concerns:
- `setups.ts` — `setupPageHeader` (SEO), `setupGoogleAnalyticsConsent`/`setupMetaPixelConsent`/`setupTikTokPixelConsent` (GDPR-gated, tenant-only ids — no platform/env fallback), `setupCursorState`, `setupSocialLogin` (GSI one-tap)
- `useMediaStreamImage.ts` — `useMediaStreamBaseUrl`/`useMediaStreamImage`/`useMediaStreamSrc`: tenant-aware Media Stream origin resolution (see Image Handling)
- `useAllAuthAuthentication.ts` / `useAllAuthAccount.ts` / `useAllAuthSessions.ts` — Auth flows
- `useCheckout.ts` — Stock reservation, Stripe payment, status polling
- `useProductFilters.ts` — Product filtering with URL state
- `useLoyalty.ts` — Loyalty program data (settings, transactions, tiers, redemption)
- `useCookieControl.ts` — GDPR cookie consent management

### App Utilities (`app/utils/`)

11 utility modules (auth, componentRegistry, error, pagination, phone, route, search, shipping-methods, sse, str, translate). Key: `auth.ts` (client-side auth helpers), `translate.ts` (`extractTranslated` for parler model translations), `error.ts` (client error handling).

### Nuxt Modules

Active modules in `nuxt.config.ts` (the `modules` array, in order):
1. `evlog/nuxt` — Structured logging (`log` auto-import on client + Nitro; see Structured Logging)
2. `@comark/nuxt` — Markdown rendering (used by blog/CMS content)
3. `@nuxt/image` — Image optimization with IPX + custom mediaStream provider
4. `@nuxt/ui` — Component library (v4, with experimental component detection)
5. `@nuxt/eslint` — ESLint integration with checker enabled
6. `@nuxt/scripts` — Third-party script management (Stripe registry)
7. `@nuxt/fonts` — Font optimization
8. `@nuxt/icon` — Icon system (server bundle: remote with externalized JSON for 9 icon sets; client bundle: scanned with 128KB limit)
9. `@nuxtjs/i18n` — Internationalization (browser detection, cookie-based, typed pages)
10. `@nuxtjs/leaflet` — Leaflet maps (locker/pickup-point selection)
11. `@nuxtjs/seo` — SEO suite (sitemap, OG image, Schema.org, link checker)
12. `@pinia/nuxt` — Pinia state management
13. `@vueuse/nuxt` — VueUse composables (device detection via `useMediaQuery` with UA-based SSR width)
14. `nuxt-auth-utils` — Session management
15. `nuxt-ai-ready` — AI/LLM discoverability: serves `/llms.txt`, `/llms-full.txt`, on-demand `/<route>.md`, and emits robots.txt Content Signals (`aiTrain`/`search`/`aiInput` all enabled). Auto-detects `@nuxtjs/i18n` and emits `Link: rel="alternate"; hreflang="el-GR"` headers on `.md` responses. Requires `robots: {}` in `nuxt.config.ts` because v1.3.0 crashes if `nuxt.options.robots` is undefined when `contentSignal` is set. `runtimeSync`/`cron` intentionally **disabled** — with 2 SSR replicas each holding an ephemeral `.data/ai-ready/pages.db`, scheduled background indexing would race and double-submit; SSR pages still index on first visit per pod via the runtime fallback.

Conditionally pushed (NOT active in production):
- `@nuxt/test-utils/module` — only when `NODE_ENV === 'test'`
- `@nuxt/a11y` — only when `NODE_ENV === 'development'` (accessibility auditing, alpha)

Custom local modules:
- `modules/cookies.ts` — Cookie consent (GDPR categories: necessary, functionality, ad, analytics, personalization, security)
- `modules/purge-comments.ts` — Removes HTML comments in production

### CI/CD

- **GitHub Actions CI** (`.github/workflows/ci.yml`): quality (TypeScript check, dependency audit) → test (unit+nuxt with coverage) → build (with Redis 8 service, .env from GitHub vars/secrets) → release (semantic-release on `main` push — versions, CHANGELOG, GitHub Release; **no npm publishing**). All steps use Node 24.x and pnpm with frozen lockfile.
- **Docker publish** (`.github/workflows/docker.yml`): On GitHub release `published`, builds a multi-stage Docker image (Node 24 Alpine) and pushes to Docker Hub (`gro0ve/grooveshop-storefront-ui-node-nuxt`) and GHCR. Uses Docker Buildx with GHA caching.
- **Semantic release**: Conventional commits, auto-versioning, CHANGELOG generation, GitHub release with `.output` asset. Publishing to npm is disabled (`npmPublish: false`); the `@semantic-release/npm` plugin only bumps `package.json` version.
- **Docker** (`docker/Dockerfile`): Multi-stage build. Build stage installs deps with pnpm cache mount, prepares Nuxt, builds with `NODE_OPTIONS=--max-old-space-size=8192`. Production stage copies only `.output`, runs as non-root `node` user.

## Conventions

- **Component structure**: `<script setup lang="ts">` → Types → Props → Composables → Constants → Computed → Methods → Lifecycle, then `<template>`, then `<style scoped>` (prefer Tailwind classes). Supports generics: `<script lang="ts" generic="T extends string | number">`
- **Naming**: Components PascalCase, files kebab-case, functions camelCase, constants UPPER_SNAKE_CASE, types/interfaces PascalCase, composables `use[Feature].ts`, custom events kebab-case
- **Linting**: ESLint via `@nuxt/eslint` with stylistic rules + `eslint-plugin-better-tailwindcss` (with NuxtUI class ignores). Key relaxed rules: `no-explicit-any: off`, `ban-ts-comment: off`, `vue/no-v-html: off`, `vue/multi-word-component-names: off`, `vue/attribute-hyphenation: off`, `nuxt/prefer-import-meta: off`. Warns on: `vue/no-watch-after-await`, `vue/no-lifecycle-after-await`, unknown Tailwind classes.
- **TypeScript**: Strict mode with type checking enabled. Typed pages (`experimental.typedPages: true`). `RouteNamedMapI18n` used for type-safe route names. Vite hoisted.
- **Releases**: Semantic release on `main` branch with conventional commits (e.g., `feat:`, `fix:`, `chore:`)
- **API route pattern**: Validate input with Zod → `$fetch` to Django → `parseDataAs` response → `handleError` in catch. `handleError` always throws — code after it is unreachable. Use `throw createError(...)` not `return createError(...)`.
- **Zod version**: Zod 4 (import from `zod`, schemas prefixed with `z`)
- **Store actions**: Must use `$fetch`, not `useFetch` (which is a setup-scope composable). `useLazyFetch` should not be `await`ed in `<script setup>` — it defeats lazy loading.
- **SSR safety**: Use VueUse `useEventListener` instead of manual `window.addEventListener`/`removeEventListener`. Guard bare `window`/`document` access with `import.meta.client` or `onMounted`.
- **Lifecycle hooks**: Vue does not await async lifecycle hooks. Use fire-and-forget with `.catch()` for cleanup work in `onBeforeUnmount`.
- **i18n**: All user-facing strings must use `t()` from `useI18n()` or component-scoped `<i18n lang="yaml">` blocks — no hardcoded Greek or English strings. Use `extractTranslated(obj, field, locale)` for API model translations.

## Environment

Copy `.env.example` to `.env`. Key variables:
- `NUXT_API_BASE_URL` — Django API URL (default `http://localhost:8000/api/v1`)
- `NUXT_DJANGO_URL` — Django base URL
- `NUXT_PUBLIC_BASE_URL` — Frontend URL (default `http://localhost:3000`)
- `NUXT_PUBLIC_DJANGO_HOST_NAME` — Public Django hostname (e.g. `api.webside.gr`); used as `X-Forwarded-Host` in all internal cluster `$fetch` calls so Django's `ALLOWED_HOSTS` validation passes and `request.build_absolute_uri()` constructs correct URLs. Also used for WebSocket connections.
- `NUXT_PUBLIC_MEDIA_STREAM_ORIGIN` / `NUXT_PUBLIC_MEDIA_STREAM_PATH` — Media processing service
- `NUXT_PUBLIC_STATIC_ORIGIN` — Static file origin (Django)
- `NUXT_CACHE_PURGE_TOKEN` — shared secret for the `/api/admin/cache/purge` route (`runtimeConfig.cachePurgeToken`); Django's Cache Management admin sends it to invalidate the Nitro SSR cache
- `NUXT_CACHE_BASE` — `redis` or `memory`
- `NUXT_REDIS_HOST` / `NUXT_REDIS_PORT` / `NUXT_REDIS_TTL` — Redis config
- `NUXT_SESSION_PASSWORD` — Session encryption password
- OAuth secrets for Google, Facebook, GitHub, Discord
- `NUXT_SITE_URL` / `NUXT_SITE_NAME` / `NUXT_SITE_DESCRIPTION` / `NUXT_SITE_DEFAULT_LOCALE` — SEO site config

Google Analytics tracking id, Meta/TikTok Pixel ids, social media links, the Stripe publishable key, and the BoxNow partner id are **tenant-only** (`TenantConfig.gaTrackingId`/`metaPixelId`/`tiktokPixelId`/`socials*`/`stripePublishableKey`/`boxNowPartnerId` via `useTenantStore()`) — no platform/env fallback. Each merchant provisions its own; there is deliberately no `NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID`/`NUXT_PUBLIC_META_PIXEL_ID`/`NUXT_PUBLIC_TIKTOK_PIXEL_ID`/`NUXT_PUBLIC_SOCIALS_*`/`NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`/`NUXT_PUBLIC_BOXNOW_PARTNER_ID` env var. Stripe-unconfigured tenants never reach the payment UI (pay-way gating hides it); `StripePayment.vue` still degrades gracefully (shows `stripe_init_error`) if it ever runs with an empty key.

<!-- skilld -->
Before modifying code, evaluate each installed skill against the current task.
For each skill, determine YES/NO relevance and invoke all YES skills before proceeding.
<!-- /skilld -->
