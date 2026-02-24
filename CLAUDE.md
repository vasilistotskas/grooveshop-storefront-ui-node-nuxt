# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nuxt 4 SSR e-commerce storefront (Vue 3 Composition API, TypeScript) that communicates with a Django REST API backend. Uses `@nuxt/ui` v4 for the component library, Pinia for state management, and `@nuxtjs/i18n` for internationalization (only Greek `el` locale is active). The Vue Options API is disabled — all components use `<script setup lang="ts">`.

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
- **Analyze bundle:** `npx nuxt analyze`
- **Package manager:** pnpm v10 (specified in `packageManager` field)

## Test Structure

Tests live in `test/` with three vitest projects configured in `vitest.config.mts`:

| Project | Path | Environment | Purpose |
|---------|------|-------------|---------|
| `unit` | `test/unit/**` | `node` | Pure utils, server utils, logic, composable unit tests |
| `nuxt` | `test/nuxt/**` | `nuxt` | Composables, stores, components, pages needing Nuxt context |
| `e2e` | `test/e2e/**` | `nuxt` | End-to-end flows |

File parallelism is disabled globally to prevent `[nuxt] instance unavailable` errors. The `nuxt` project has retry=2 and testTimeout=15000 for flaky tests. Both `e2e` and `nuxt` projects mock `intersectionObserver` and `indexedDb`, and disable `experimental.appManifest` to prevent timeout errors. Path aliases: `~` and `@` → `./app`, `#shared` → `./shared`.

Coverage uses v8 provider, reports to `./coverage` in text/html/lcov/json formats, covering `app/**` and `server/**`.

## Architecture

### Directory Layout (Nuxt 4 `app/` convention)

- `app/` — Client-side: components, pages, composables, stores, plugins, middleware, layouts, utils, providers, assets
- `server/` — Nitro server: API proxy routes, middleware, plugins, utils
- `shared/` — Auto-imported in both app and server: types, constants, schemas (Zod), utils, OpenAPI generated code
- `modules/` — Custom Nuxt modules (`cookies.ts` for cookie consent, `purge-comments.ts` removes HTML comments in prod)
- `runtime/` — Runtime code for the custom cookie control module (plugin, methods, types, utils)
- `i18n/` — Locale config (`locales.ts` exports `SUPPORTED_LOCALES`/`DEFAULT_LOCALE`), locale detector, i18n config, and translation files (el-GR primary, plus domain-specific: auth, breadcrumb, cookies, validation). Only `el` locale is active; en-US and de-DE files exist but are unused
- `openapi/` — Schema files (`schema.json`, `schema.yml`) fetched from Django for type generation
- `scripts/` — `fetch-schema.mjs` for downloading OpenAPI schema from Django

### Backend Communication Pattern

The Nuxt server acts as a **proxy** to the Django backend. Client-side code calls `/api/...` routes on the Nuxt server, which then forwards requests to the Django API (`NUXT_API_BASE_URL`).

- **Server API routes** (`server/api/`): Proxy endpoints organized by domain — products, cart, orders, order-items, blog (posts/comments/categories), user (account/addresses), search, loyalty, notifications, subscriptions (topics/user), contact, countries, regions, pay-way, settings, health, websocket
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
- `log.ts` — Request logging with performance timing, warns on requests >200ms
- `redirects.ts` — 301 redirect from `www.` to non-www

### Server Plugins

- `http-agent.ts` — Undici Agent for connection pooling (100 connections, pipelining 10, keep-alive 30s) — reduces latency for internal API calls
- `storage.ts` — Configurable cache backend: tests Redis connectivity, falls back to memory driver if unavailable

### Server Routes

- `server/routes/auth/google.get.ts` and `facebook.get.ts` — OAuth callback handlers (store tokens in encrypted session, not URL params)
- `server/api/auth/oauth-params.get.ts` — One-time-use endpoint that reads OAuth params from session and clears them
- `server/routes/rss.xml.get.ts` — RSS feed generation (cached, SWR) combining blog posts and products with media:content, reading time, product pricing/availability
- `server/api/__sitemap__/urls.ts` — Dynamic sitemap URL source for `@nuxtjs/sitemap`

### Authentication

Uses [django-allauth](https://docs.allauth.org/) headless API via `nuxt-auth-utils` session management:

- **Server proxy**: `server/api/_allauth/app/v1/` mirrors the full allauth API (auth: login/signup/session/2FA/WebAuthn/email-verify/password-reset/code-auth/provider-token; account: email/password/providers/authenticators including TOTP/recovery-codes/WebAuthn)
- **Client composables**: `useAllAuthAuthentication` (login/signup/OAuth/session), `useAllAuthAccount` (email/password), `useAllAuthSessions` (session management)
- **Auth store** (`app/stores/auth.ts`): Holds config, session, authenticators (TOTP, WebAuthn, recovery codes), provides `setupConfig`/`setupSession`/etc.
- **Auth plugin** (`app/plugins/auth.ts`): Listens to `auth:change` Nuxt hook, determines auth event type (LOGGED_IN/LOGGED_OUT/REAUTHENTICATED/FLOW_UPDATED), handles navigation. Depends on nothing, runs in parallel.
- **Setup plugin** (`app/plugins/setup.ts`): Depends on `auth` plugin. SSR-critical: fetches config + session, then account + cart. Defers sessions/authenticators/notifications to client via `requestIdleCallback` (with `setTimeout` fallback for Safari).
- **WebSocket plugin** (`app/plugins/websocket.client.ts`): Client-only, connects to Django WebSocket at `/ws/notifications/` for real-time notifications. Uses BroadcastChannel and Web Notification API.
- **Auth middleware** (`app/middleware/auth.global.ts`): Global — redirects unauthenticated users from protected routes (defined as `AuthenticatedRoutes` in `shared/constants/index.ts`)
- **Guest middleware** (`app/middleware/guest.ts`): Prevents logged-in users from accessing login/signup pages
- **Auth flow routing**: `Flow2path` constant maps allauth flow states to page routes (login, signup, MFA, reauthenticate, WebAuthn, recovery codes)
- **Session types**: `shared/auth.d.ts` augments `#auth-utils` with `User`, `UserSession`, `SecureSessionData` (sessionToken, accessToken, oauthParams). Note: `setUserSession` uses defu merge (ignores undefined); use `replaceUserSession` to fully clear session keys
- **Global types**: `global.d.ts` declares `$authState` and `$websocket` on Vue component properties and NuxtApp, plus `auth:change` runtime hook and `window.google` GSI types

### Image Handling

Custom `mediaStream` provider (`app/providers/media-stream.ts`) generates URLs for an external media processing service. URL pattern: `/{src}/{width}/{height}/{fit}/{position}/{background}/{trimThreshold}/{quality}.{format}`. Handles Unicode URL encoding for social media crawlers. Also uses `@nuxt/image` with IPX for local images (AVIF, WebP formats). Image screens configured: xs(320), sm(640), md(768), lg(1024), xl(1280), xxl/2xl(1536).

### OpenAPI Type Generation

Types and Zod schemas are auto-generated from the Django backend's OpenAPI schema:
1. `pnpm generate:schema` — fetches `schema.json`/`schema.yml` from Django (needs `DJANGO_API_TOKEN` env var or `.auth-token` file)
2. `pnpm openapi-ts` — generates `shared/openapi/types.gen.ts` and `shared/openapi/zod.gen.ts` via `@hey-api/openapi-ts`

### Shared Code (`shared/`)

Auto-imported in both app and server contexts (via `imports.dirs` and `nitro.imports.dirs`). Contains:
- `types/` — Hand-written types organized by domain: `body/all-auth/`, `model/all-auth/`, `response/all-auth/`, `error/all-auth/`, plus `pagination.ts`, `ordering.ts`, `search.ts`, `form.ts`, `meilisearch.ts`, `LoyaltySettings.ts`, `enum/`, `utility/`
- `schemas/` — Zod validation schemas mirroring the types structure: `body/all-auth/`, `model/all-auth/`, `response/all-auth/`, `error/all-auth/`, plus `pagination.ts`, `ordering.ts`, `form.ts`
- `openapi/` — Auto-generated `types.gen.ts` and `zod.gen.ts`
- `constants/` — `AuthenticatedRoutes`, `AuthenticatedRoutesSet`, `THEME_COLORS`, `Flow2path`, `AuthChangeEvent`, `GSIAuthProcess`, `RedirectToURLs`, `Flows`, `AuthenticatorType`, `floorChoicesList`, `locationChoicesList`, `defaultSelectOptionChoose`
- `utils/` — `error.ts` (error helpers), `html.ts` (HTML processing)

### State Management

Pinia stores in `app/stores/`:
- `auth` — Session, config, authenticators, 2FA state, social providers, has_usable_password detection
- `cart` — Cart items, totals, stock validation (out-of-stock, limited stock detection, stock status messages)
- `user` — User account data, addresses, favorites, reviews, orders
- `user-notification` — Notification state, unseen count
- `app` — Global UI state, health check

### Key Composables

- `setups.ts` — `setupPageHeader` (SEO meta, i18n head), `setupGoogleAnalyticsConsent` (GDPR cookie consent → gtag), `setupCursorState`, `setupSocialLogin` (Google GSI one-tap)
- `useCheckout.ts` — Stock reservation, payment intent creation (Stripe), payment status polling
- `useInstantSearch.ts` — Debounced search with AbortController, URL query sync, Meilisearch endpoints (products, blog-posts, federated)
- `useProductFilters.ts` — Product filtering with URL state management
- `usePriceFormat.ts` — Currency formatting (EUR)
- `useLoyalty.ts` — Loyalty program data (settings, transactions, tiers, redemption)
- `useAllAuthAuthentication.ts` — Login, signup, OAuth, session management
- `useAllAuthAccount.ts` — Email, password management
- `useAllAuthSessions.ts` — Session listing and management
- `useAccountMenus.ts` — Dynamic account sidebar menus (conditionally shows loyalty if enabled)
- `useAuthInfo.ts` — Auth information helpers
- `useAuthPreviewMode.ts` — Auth preview mode toggle
- `useCookieControl.ts` — GDPR cookie consent management
- `useNotification.ts` — Toast notification helpers
- `useUserNotification.ts` — User notification state
- `useOrder.ts` — Order processing helpers
- `useOrdering.ts` — Sort/ordering state management
- `usePagination.ts` — Pagination state management
- `useProductUrl.ts` — Product URL generation
- `useProductSearchData.ts` — Product search data helpers
- `useReducedMotion.ts` — Prefers-reduced-motion detection
- `useSubscriptionTopics.ts` — Subscription topic management
- `useUserSubscriptions.ts` — User subscription management
- `usePaymentMethod.ts` — Payment method helpers
- `useViewCount.ts` — View count tracking
- `useDateLocale.ts` — Date locale formatting
- `useHtmlContent.ts` — HTML content processing
- `useIframe.ts` — Iframe management
- `useSingleton.ts` — Singleton pattern helper
- `useSyncProps.ts` — Two-way prop sync
- `useSticky.ts` — Sticky positioning
- `useText.ts` — Text manipulation
- `useUrls.ts` — URL generation helpers
- `vue.ts` — Vue utility helpers

### App Utilities (`app/utils/`)

- `array.ts` — Array manipulation helpers
- `auth.ts` — Client-side auth utilities
- `boolean.ts` — Boolean parsing
- `color.ts` — Color manipulation
- `date.ts` — Date formatting
- `dom.ts` — DOM helpers
- `error.ts` — Client-side error handling
- `pagination.ts` — Pagination calculations
- `route.ts` — Route helpers
- `search.ts` — Search utilities
- `str.ts` — String manipulation
- `theme.ts` — Theme helpers
- `translate.ts` — Translation utilities

### Layouts

- `default` — Public pages: header/navbar, mobile bottom navigation, footer (lazy-loaded, device-aware)
- `user` — Authenticated pages: header, user account info banner, sidebar navigation, footer
- `auth` — Login/signup flows

### Middleware

- `auth.global.ts` — Global: redirects unauthenticated users from protected routes
- `guest.ts` — Prevents logged-in users from accessing login/signup pages
- `disable-vue-transitions.global.ts` — Global: disables page/layout transitions when View Transitions API is unavailable
- `loyalty-enabled.ts` — Redirects to home if loyalty system is disabled

### Pages (Routing)

- `/` — Home page
- `/products/`, `/products/category/[id]/[slug]`, `/products/[id]/[slug]` — Product browsing
- `/blog/`, `/blog/categories/`, `/blog/category/[id]/[slug]`, `/blog/post/[id]/[slug]` — Blog
- `/cart/`, `/checkout/`, `/checkout/success/[uuid]` — Shopping flow
- `/search/` — Search results
- `/account/` — Dashboard with extensive sub-routes: login (including code-based), signup (including passkey), 2FA (TOTP, WebAuthn, recovery codes), password management, email, addresses, orders, favourites (products + posts), reviews, sessions, providers, subscriptions, loyalty, settings, help, verify-email, reauthenticate, provider callback/signup
- Static pages: about, contact, feedback, cookies-policy, privacy-policy, return-policy, terms-of-use, loyalty-program, vision, what-is-microlearning, why-microlearning

### Component Categories

Components in `app/components/` organized by domain:
- **Account** — Login/Signup forms, 2FA flows (TOTP, WebAuthn, recovery codes), email/password/sessions/providers management, settings, auth navigation
- **Blog** — Post lists/carousels, comments (with likes), categories, sidebar, tags, content renderer
- **Cart** — Cart button (with item count), item cards
- **Checkout** — Items list, payment ways selector
- **Cookie** — GDPR consent modal/control, iframe blocker
- **DynamicForm** — Multi-step form system with navigation
- **Loyalty** — PointsBadge, Summary, TierSystem, ProgressHero, Transactions, Redemption
- **Order** — Order list, card items
- **Product** — Image/ImageModal, Review/Reviews, Favourites, CardSkeleton, Categories slider
- **Products** — List, Slider, Toolbar, Sidebar, Filters (SearchInput, PriceRange, ActiveFilters, CategoryFilter, AttributeFilter, PopularityFilter, ViewCountFilter)
- **Search** — Input, Modal, Result
- **User** — Avatar, NotificationsBell, Account info/favourites navbar
- **Page** — Header, Navbar, Title
- **UI/Layout** — Pagination (PageNumber, LimitOffset, Cursor), Ordering, Rating, Quantity Selector, BackButton, ReadMore, Empty states, LoadingIndicator, DesktopOnly, MobileOrTabletOnly, Socials, Anchor, ImgWithFallback, IframeModal, DemoModeMessage, Error
- **Integrations** — StripePayment, WebAuthn LoginButton, Language Switcher, Logout Button, Form TurnstileContainer

### UI & Styling

- **Tailwind CSS 4** with `@nuxt/ui` v4 theme system. Primary color: neutral, neutral: zinc. Custom CSS variables: `--ui-secondary: #003DFF`, `--ui-bg`, `--ui-liked: #FF00BD`, semantic colors (success, info, warning, error) with dark mode variants
- `app/assets/css/main.css` — Imports `tailwindcss` with static theme + `@nuxt/ui`. Custom theme containers (`--container-main: 74.625rem`, `--container-8xl: 90rem`). `.article` typography class for blog/CMS content. Reduced-motion support.
- `app/app.config.ts` — Component customization: extended avatar sizes (4xl-7xl), button 3xl size, chip 3xl size, secondary solid button variant, cursor-pointer defaults (button, switch, tabs, accordion), form field sizing, skeleton/breadcrumb theming, pagination/selectMenu/input/textarea full-width defaults. Icon mode: CSS with base layer.
- Component-scoped `<i18n lang="yaml">` blocks for translations (e.g., `error.vue`)
- Lottie animations in `app/assets/lotties/` (404, checkout, heart, etc.)

### SEO & Performance

- **`@nuxtjs/seo`** suite: sitemap (dynamic via `/api/__sitemap__/urls`, auto-excludes account/cart/checkout routes, 24h cache), OG Image (7-day cache), Schema.org (minified), link checker (dev only), canonical URL redirects
- **Route rules**: Immutable caching for `/_nuxt/**`, static assets, images, CSS/JS. CORS for `/api/**`. Custom headers for manifest, favicons. IPX image prerendering.
- **Experimental features**: `typedPages`, `asyncContext`, `inlineRouteRules`, `crossOriginPrefetch`, `buildCache`, `viteEnvironmentApi` (disabled in test). NuxtLink prefetch on interaction (not visibility).
- **Nitro**: ESBuild target `esnext`, gzip + brotli compression, minification, async context. Prerendered routes for critical above-the-fold images.
- **DNS prefetch + preconnect**: Media stream, static origin, Django, Google services
- **Source maps**: Client-side only (server disabled for smaller production bundles)

### Nuxt Modules

Active modules in `nuxt.config.ts`:
1. `@nuxt/image` — Image optimization with IPX + custom mediaStream provider
2. `@nuxt/ui` — Component library (v4, with experimental component detection)
3. `@nuxt/eslint` — ESLint integration with checker enabled
4. `@nuxt/test-utils/module` — Test utilities
5. `@nuxt/scripts` — Third-party script management (Stripe registry)
6. `@nuxt/fonts` — Font optimization
7. `@nuxt/icon` — Icon system (server bundle: remote with externalized JSON for 9 icon sets; client bundle: scanned with 128KB limit)
8. `@nuxtjs/i18n` — Internationalization (browser detection, cookie-based, typed pages)
9. `@nuxtjs/device` — Device detection (desktop/mobile/tablet)
10. `@nuxtjs/seo` — SEO suite (sitemap, OG image, Schema.org, link checker)
11. `@pinia/nuxt` — Pinia state management
12. `@vueuse/nuxt` — VueUse composables
13. `nuxt-auth-utils` — Session management
14. `@nuxt/a11y` — Accessibility auditing (alpha)
15. Custom `modules/cookies.ts` — Cookie consent (GDPR categories: necessary, functionality, ad, analytics, personalization, security)
16. Custom `modules/purge-comments.ts` — Removes HTML comments in production

### CI/CD

- **GitHub Actions CI** (`.github/workflows/ci.yml`): quality (TypeScript check, dependency audit) → test (unit+nuxt with coverage → Coveralls) → build (with Redis 8 service, .env from GitHub vars/secrets) → release (semantic-release, only on main push). All steps use Node 24.x and pnpm with frozen lockfile.
- **Docker publish** (`.github/workflows/docker.yml`): On release, builds multi-stage Docker image (Node 24.13.0 Alpine), pushes to Docker Hub (`gro0ve/grooveshop-storefront-ui-node-nuxt`) and GHCR. Uses Docker Buildx with GHA caching.
- **Semantic release**: Conventional commits, auto-versioning, CHANGELOG generation, GitHub release with assets
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
- `NUXT_PUBLIC_DJANGO_HOST_NAME` — Django hostname for WebSocket connections
- `NUXT_PUBLIC_MEDIA_STREAM_ORIGIN` / `NUXT_PUBLIC_MEDIA_STREAM_PATH` — Media processing service
- `NUXT_PUBLIC_STATIC_ORIGIN` — Static file origin (Django)
- `NUXT_CACHE_BASE` — `redis` or `memory`
- `NUXT_REDIS_HOST` / `NUXT_REDIS_PORT` / `NUXT_REDIS_TTL` — Redis config
- `NUXT_SESSION_PASSWORD` — Session encryption password
- `NUXT_AUTH_COOKIE_DOMAIN` — Auth cookie domain
- OAuth secrets for Google, Facebook, GitHub, Discord
- `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe payment integration
- `NUXT_PUBLIC_TURNSTILE_SITE_KEY` / `NUXT_TURNSTILE_SECRET_KEY` — Cloudflare Turnstile bot protection
- `NUXT_SITE_URL` / `NUXT_SITE_NAME` / `NUXT_SITE_DESCRIPTION` / `NUXT_SITE_DEFAULT_LOCALE` — SEO site config
- `NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID` — Google Analytics
- `NUXT_PUBLIC_SOCIALS_*` — Social media links (Discord, Facebook, Instagram, Pinterest, Reddit, TikTok, Twitter, YouTube)
