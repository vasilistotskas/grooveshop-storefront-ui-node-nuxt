# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nuxt 4 SSR e-commerce storefront (Vue 3 Composition API, TypeScript) that communicates with a Django REST API backend. Uses `@nuxt/ui` v4 for the component library, Pinia for state management, and `@nuxtjs/i18n` for internationalization (default locale: Greek `el`, also English and German). The Vue Options API is disabled — all components use `<script setup lang="ts">`.

## Commands

- **Dev server:** `pnpm dev`
- **Build:** `pnpm build`
- **Lint (with auto-fix):** `pnpm lint`
- **Lint (CI, cached):** `pnpm lint:ci`
- **Type check:** `npx vue-tsc --noEmit`
- **Run all tests:** `pnpm test`
- **Run CI tests (unit + nuxt with coverage):** `pnpm test:ci`
- **Run a single test file:** `pnpm vitest run test/unit/utils/str.spec.ts`
- **Run a single test project:** `pnpm vitest run --project=unit` or `--project=nuxt`
- **Generate OpenAPI types:** `pnpm openapi-ts` (requires `openapi/schema.json` — fetch with `pnpm generate:schema`)
- **Prepare Nuxt types:** `pnpm prepare`
- **Build + start production:** `pnpm build && pnpm start`
- **Docker build:** `docker build -f docker/Dockerfile .`
- **Package manager:** pnpm v10 (specified in `packageManager` field)

## Test Structure

Tests live in `test/` with three vitest projects configured in `vitest.config.mts`:

| Project | Path | Environment | Purpose |
|---------|------|-------------|---------|
| `unit` | `test/unit/**` | `node` | Pure utils, server utils, logic |
| `nuxt` | `test/nuxt/**` | `nuxt` | Composables, stores, components needing Nuxt context |
| `e2e` | `test/e2e/**` | `nuxt` | End-to-end flows |

File parallelism is disabled globally to prevent `[nuxt] instance unavailable` errors. The `nuxt` project has retry=2 and testTimeout=15000 for flaky tests. Path aliases: `~` and `@` → `./app`, `#shared` → `./shared`.

## Architecture

### Directory Layout (Nuxt 4 `app/` convention)

- `app/` — Client-side: components, pages, composables, stores, plugins, middleware, layouts, utils, providers, assets
- `server/` — Nitro server: API proxy routes, middleware, plugins, utils
- `shared/` — Auto-imported in both app and server: types, constants, schemas (Zod), utils, OpenAPI generated code
- `modules/` — Custom Nuxt modules (`cookies.ts` for cookie consent, `purge-comments.ts` removes HTML comments in prod)
- `runtime/` — Runtime code for the custom cookie control module
- `i18n/` — Locale config and translation files (el-GR, en-US, de-DE, plus domain-specific: auth, breadcrumb, cookies, validation)

### Backend Communication Pattern

The Nuxt server acts as a **proxy** to the Django backend. Client-side code calls `/api/...` routes on the Nuxt server, which then forwards requests to the Django API (`NUXT_API_BASE_URL`).

- **Server API routes** (`server/api/`): Proxy endpoints organized by domain — products, cart, orders, blog, user, search, loyalty, notifications, subscriptions, contact, countries, regions, pay-way, settings, health, websocket
- **Server API pattern**: Routes use `getValidatedQuery`/`readValidatedBody` with Zod schemas, `$fetch` to Django, `parseDataAs` for response validation, `handleError` for error handling. Many routes use `defineCachedEventHandler` with SWR for caching.
- **`server/utils/auth.ts`**: Creates forwarding headers (`X-Session-Token`, `Authorization`, `X-Forwarded-Host`) for Django requests; `processAllAuthSession` handles token propagation
- **`server/utils/api.ts`**: `createCachedFetcher<T>` for paginated data fetching with caching
- **`server/utils/cartSession.ts`**: Cart session management via `useCartSession(event)` — stores `cartId` in http-only session cookies, provides `getCartHeaders`/`handleCartResponse`/`clearCartSession`
- **`server/utils/parser.ts`**: `parseDataAs(data, zodSchema)` for runtime validation of API responses
- **`server/utils/error.ts`**: `handleError` (Zod/Fetch/H3 errors), `handleAllAuthError` (auth-specific errors with session management)
- **`server/utils/hooks.ts`**: Hookable `allAuthHooks` event system for auth state changes between server and client
- **`server/utils/logger.ts`**: `Logger` class that writes error logs to `./logs/` as JSON files

### Server Middleware

- `1.locale.ts` — Locale detection: query param → i18n cookies → Accept-Language header → stores in `event.context.locale`
- `log.ts` — Request logging with performance timing, warns on requests >200ms, sets Server-Timing header
- `redirects.ts` — 301 redirect from `www.` to non-www

### Server Plugins

- `http-agent.ts` — Undici Agent for connection pooling (100 connections, pipelining 10, keep-alive 30s) — reduces latency for internal API calls
- `storage.ts` — Configurable cache backend: tests Redis connectivity, falls back to memory driver if unavailable

### Authentication

Uses [django-allauth](https://docs.allauth.org/) headless API via `nuxt-auth-utils` session management:

- **Server proxy**: `server/api/_allauth/app/v1/` mirrors the full allauth API (auth: login/signup/session/2FA/WebAuthn/email-verify/password-reset/code-auth/provider-token; account: email/password/providers/authenticators including TOTP/recovery-codes/WebAuthn)
- **Client composables**: `useAllAuthAuthentication` (login/signup/OAuth/session), `useAllAuthAccount` (email/password), `useAllAuthSessions` (session management)
- **Auth store** (`app/stores/auth.ts`): Holds config, session, authenticators (TOTP, WebAuthn, recovery codes), provides `setupConfig`/`setupSession`/etc.
- **Auth plugin** (`app/plugins/auth.ts`): Listens to `auth:change` Nuxt hook, determines auth event type (LOGGED_IN/LOGGED_OUT/REAUTHENTICATED/FLOW_UPDATED), handles navigation. Depends on nothing, runs in parallel.
- **Setup plugin** (`app/plugins/setup.ts`): Depends on `auth` plugin. SSR-critical: fetches config + session, then account + cart. Defers sessions/authenticators/notifications to client via `requestIdleCallback`.
- **WebSocket plugin** (`app/plugins/websocket.client.ts`): Client-only, connects to Django WebSocket at `/ws/notifications/` for real-time notifications. Uses BroadcastChannel and Web Notification API.
- **Auth middleware** (`app/middleware/auth.global.ts`): Global — redirects unauthenticated users from protected routes (defined as `AuthenticatedRoutes` in `shared/constants/index.ts`)
- **Guest middleware** (`app/middleware/guest.ts`): Prevents logged-in users from accessing login/signup pages
- **OAuth routes** (`server/routes/auth/`): Google and Facebook OAuth callbacks
- **Auth flow routing**: `Flow2path` constant maps allauth flow states to page routes (login, signup, MFA, reauthenticate, WebAuthn, recovery codes)
- **Session types**: `shared/auth.d.ts` augments `#auth-utils` with `User`, `UserSession`, `SecureSessionData` (sessionToken, accessToken)
- **Global types**: `global.d.ts` declares `$authState` and `$websocket` on Vue component properties and NuxtApp, plus `auth:change` runtime hook

### Image Handling

Custom `mediaStream` provider (`app/providers/media-stream.ts`) generates URLs for an external media processing service. URL pattern: `/{src}/{width}/{height}/{fit}/{position}/{background}/{trimThreshold}/{quality}.{format}`. Handles Unicode URL encoding for social media crawlers. Also uses `@nuxt/image` with IPX for local images (AVIF, WebP formats).

### OpenAPI Type Generation

Types and Zod schemas are auto-generated from the Django backend's OpenAPI schema:
1. `pnpm generate:schema` — fetches `schema.json` from Django (needs `DJANGO_API_TOKEN` env var or `.auth-token` file)
2. `pnpm openapi-ts` — generates `shared/openapi/types.gen.ts` and `shared/openapi/zod.gen.ts` via `@hey-api/openapi-ts`

### Shared Code (`shared/`)

Auto-imported in both app and server contexts (via `imports.dirs` and `nitro.imports.dirs`). Contains:
- `types/` — Hand-written types organized by domain: `body/all-auth/`, `model/all-auth/`, `response/all-auth/`, `error/all-auth/`, plus `pagination.ts`, `ordering.ts`, `search.ts`, `form.ts`, `meilisearch.ts`, `LoyaltySettings.ts`, `enum/`, `utility/`
- `schemas/` — Zod validation schemas mirroring the types structure: `body/all-auth/`, `model/all-auth/`, `response/all-auth/`, `error/all-auth/`, plus `pagination.ts`, `ordering.ts`, `form.ts`
- `openapi/` — Auto-generated `types.gen.ts` and `zod.gen.ts`
- `constants/` — `AuthenticatedRoutes`, `THEME_COLORS`, `Flow2path`, `AuthChangeEvent`, `GSIAuthProcess`, `RedirectToURLs`, `Flows`, `AuthenticatorType`
- `utils/` — `error.ts` (error helpers), `html.ts` (HTML processing)

### State Management

Pinia stores in `app/stores/`:
- `auth` — Session, config, authenticators, 2FA state, social providers
- `cart` — Cart items, totals, stock validation (out-of-stock, limited stock detection)
- `user` — User account data, addresses, favorites, reviews, orders
- `user-notification` — Notification state
- `app` — Global UI state, health check

### Key Composables

- `setups.ts` — `setupPageHeader` (SEO meta, i18n head), `setupGoogleAnalyticsConsent` (GDPR cookie consent → gtag), `setupCursorState`, `setupSocialLogin` (Google GSI one-tap)
- `useCheckout.ts` — Stock reservation, payment intent creation (Stripe), payment status polling
- `useInstantSearch.ts` — Debounced search with AbortController, URL query sync, Meilisearch endpoints (products, blog-posts, federated)
- `useProductFilters.ts` — Product filtering with URL state management
- `usePriceFormat.ts` — Currency formatting (EUR)
- `useLoyalty.ts` — Loyalty program data

### Layouts

- `default` — Public pages: header/navbar, mobile bottom navigation, footer (lazy-loaded, device-aware)
- `user` — Authenticated pages: header, user account info banner, sidebar navigation, footer
- `auth` — Login/signup flows

### Pages (Routing)

- `/` — Home page
- `/products/`, `/products/category/[id]/[slug]`, `/products/[id]/[slug]` — Product browsing
- `/blog/`, `/blog/categories/`, `/blog/category/[id]/[slug]`, `/blog/post/[id]/[slug]` — Blog
- `/cart/`, `/checkout/`, `/checkout/success/[uuid]` — Shopping flow
- `/search/` — Search results
- `/account/` — Dashboard with extensive sub-routes: login (including code-based), signup (including passkey), 2FA (TOTP, WebAuthn, recovery codes), password management, email, addresses, orders, favourites, reviews, sessions, providers, subscriptions, loyalty, settings, help
- Static pages: about, contact, feedback, cookies-policy, privacy-policy, return-policy, terms-of-use, loyalty-program, vision

### UI & Styling

- **Tailwind CSS 4** with `@nuxt/ui` theme system. Primary color: neutral, neutral: zinc. Custom `--ui-secondary: #003DFF`
- `app/assets/css/main.css` — Theme variables (light/dark), `.article` typography class, reduced-motion support
- `app/app.config.ts` — Component customization: extended avatar sizes (4xl-7xl), button 3xl size, secondary solid button variant, cursor-pointer defaults, form field sizing
- Component-scoped `<i18n lang="yaml">` blocks for translations (e.g., `error.vue`)
- Lottie animations in `app/assets/lotties/` (404, checkout, heart, etc.)

### CI/CD

- **GitHub Actions CI** (`.github/workflows/ci.yml`): quality (TypeScript check) → test (unit+nuxt with coverage → Coveralls) → build (with Redis service) → release (semantic-release, only on main push)
- **Docker publish** (`.github/workflows/docker.yml`): On release, builds multi-stage Docker image (Node 24 Alpine), pushes to Docker Hub (`gro0ve/grooveshop-storefront-ui-node-nuxt`) and GHCR
- **Semantic release**: Conventional commits, auto-versioning, CHANGELOG generation, GitHub release with assets

## Conventions

- **Component structure**: `<script setup lang="ts">` → Types → Props → Composables → Constants → Computed → Methods → Lifecycle, then `<template>`, then `<style scoped>` (prefer Tailwind classes). Supports generics: `<script lang="ts" generic="T extends string | number">`
- **Naming**: Components PascalCase, files kebab-case, functions camelCase, constants UPPER_SNAKE_CASE, types/interfaces PascalCase, composables `use[Feature].ts`, custom events kebab-case
- **Linting**: ESLint via `@nuxt/eslint` with stylistic rules + `eslint-plugin-better-tailwindcss`. Key relaxed rules: `no-explicit-any: off`, `ban-ts-comment: off`, `vue/no-v-html: off`, `vue/multi-word-component-names: off`
- **TypeScript**: Strict mode with type checking enabled. Typed pages (`experimental.typedPages: true`). `RouteNamedMapI18n` used for type-safe route names.
- **Releases**: Semantic release on `main` branch with conventional commits (e.g., `feat:`, `fix:`, `chore:`)
- **API route pattern**: Validate input with Zod → `$fetch` to Django → `parseDataAs` response → `handleError` in catch

## Environment

Copy `.env.example` to `.env`. Key variables:
- `NUXT_API_BASE_URL` — Django API URL (default `http://localhost:8000/api/v1`)
- `NUXT_DJANGO_URL` — Django base URL
- `NUXT_PUBLIC_BASE_URL` — Frontend URL (default `http://localhost:3000`)
- `NUXT_PUBLIC_DJANGO_HOST_NAME` — Django hostname for WebSocket connections
- `NUXT_PUBLIC_MEDIA_STREAM_ORIGIN` / `NUXT_PUBLIC_MEDIA_STREAM_PATH` — Media processing service
- `NUXT_CACHE_BASE` — `redis` or `memory`
- `NUXT_REDIS_HOST` / `NUXT_REDIS_PORT` / `NUXT_REDIS_TTL` — Redis config
- `NUXT_SESSION_PASSWORD` — Session encryption password
- OAuth secrets for Google, Facebook, GitHub, Discord
- `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe payment integration
- `NUXT_SITE_URL` / `NUXT_SITE_NAME` / `NUXT_SITE_DESCRIPTION` — SEO site config
