---
paths:
  - "app/components/**"
  - "app/layouts/**"
  - "app/pages/**"
  - "app/middleware/**"
---

# Components, layouts and pages

Component categories, styling, images, routing and the SEO/performance constraints.

## Image Handling

Custom `mediaStream` provider (`app/providers/media-stream.ts`) generates URLs for an external media processing service. URL pattern: `/{src}/{width}/{height}/{fit}/{position}/{background}/{trimThreshold}/{quality}.{format}`. Handles Unicode URL encoding for social media crawlers. Also uses `@nuxt/image` with IPX for local images (AVIF, WebP formats). Image screens configured: xs(320), sm(640), md(768), lg(1024), xl(1280), xxl/2xl(1536).

The provider's `baseURL` option is static (baked from `NUXT_PUBLIC_MEDIA_STREAM_PATH` at build time) — @nuxt/image has no per-request/per-tenant hook. Per-tenant asset origins (`TenantConfig.assetsDomain`) are instead resolved by `useMediaStreamBaseUrl`/`useMediaStreamImage` (`app/composables/useMediaStreamImage.ts`), which absolutize the relative `src` BEFORE it reaches `$img()`/`NuxtImg`; the provider skips its own `baseURL` whenever `src` already carries a protocol. `ImgWithFallback.vue` does the same absolutization for `media/{schema}/uploads/...` and `static/images/...` paths.

## Layouts

- `default` — Public pages: header/navbar, mobile bottom navigation, footer (lazy-loaded, device-aware)
- `user` — Authenticated pages: header, user account info banner, sidebar navigation, footer
- `auth` — Login/signup flows

## Middleware

- `auth.global.ts` — Global: redirects unauthenticated users from protected routes
- `identity.global.ts` — Global: hydrates identity/session state
- `guest.ts` — Prevents logged-in users from accessing login/signup pages
- `loyalty-enabled.ts` — Redirects to home if loyalty system is disabled for the tenant
- `blog-enabled.ts` — Redirects to home if blog is disabled for the tenant
- `account-reviews-enabled.ts` — Gates the account reviews route

(Page/layout transitions are disabled globally in `nuxt.config.ts` via `app.pageTransition: false` / `layoutTransition: false` — no middleware needed.)

## Pages (Routing)

Routes in `app/pages/`: home, products (with category/detail), blog (with category/post), cart, checkout (with success), search, account (extensive sub-routes for auth/2FA/profile/orders/favourites/reviews/subscriptions/loyalty/settings), and static content pages. See `app/pages/` for full structure.

## Component Categories

Components in `app/components/` organized by domain:
- **Account** — Login/Signup forms, 2FA flows (TOTP, WebAuthn, recovery codes), email/password/sessions/providers management, settings, auth navigation
- **Blog** — Post lists/carousels, comments (with likes), categories, tags, content renderer
- **Cart** — Cart button (with item count), item cards
- **Checkout** — Items list
- **Cookie** — GDPR consent modal/control
- **DynamicForm** — Multi-step form system
- **Loyalty** — PointsBadge, Summary, TierSystem, ProgressHero, Transactions, Redemption
- **Order** — Order list, card items
- **Product** — Image/ImageModal, Reviews (List/Summary/Card), Favourites, CardSkeleton, Categories slider
- **Products** — List, Slider, Toolbar, Sidebar, Filters (SearchInput, PriceRange, ActiveFilters, CategoryFilter, AttributeFilter, PopularityFilter, ViewCountFilter)
- **Search** — Input, Modal, Result
- **User** — Avatar, NotificationsBell, Account info/favourites navbar
- **Page** — Header, Navbar, Title
- **UI/Layout** — Pagination (PageNumber, LimitOffset, Cursor), Ordering, Rating, Quantity Selector, ReadMore, Empty state, LoadingIndicator, DesktopOnly, MobileOrTabletOnly, Socials, Anchor, ImgWithFallback, IframeModal, DemoModeMessage, Error
- **Integrations** — StripePayment, WebAuthn LoginButton, Language Switcher, Logout Button

## UI & Styling

- **Tailwind CSS 4** with `@nuxt/ui` v4 theme system. Primary color: neutral, neutral: zinc. Custom CSS variables: `--ui-secondary: #003DFF`, `--ui-bg`, `--ui-liked: #FF00BD`, semantic colors (success, info, warning, error) with dark mode variants
- `app/assets/css/main.css` — Imports `tailwindcss` with static theme + `@nuxt/ui`. Custom theme containers (`--container-main: 74.625rem`, `--container-8xl: 90rem`). `.article` typography class for blog/CMS content. Reduced-motion support.
- `app/app.config.ts` — Component customization: extended avatar sizes (4xl-7xl), button 3xl size, chip 3xl size, secondary solid button variant, cursor-pointer defaults (button, switch, tabs, accordion), form field sizing, skeleton/breadcrumb theming, pagination/selectMenu/input/textarea full-width defaults. Icon mode: CSS with base layer.
- Component-scoped `<i18n lang="yaml">` blocks for translations (e.g., `error.vue`)
- Lottie animations in `app/assets/lotties/` (404)

## SEO & Performance

- **`@nuxtjs/seo`** suite: sitemap (dynamic via `/api/__sitemap__/urls`, auto-excludes account/cart/checkout routes, 24h cache), OG Image (7-day cache), Schema.org (minified), link checker (dev only), canonical URL redirects
- **Route rules**: Immutable caching for `/_nuxt/**`, static assets, images, CSS/JS. CORS for `/api/**`. Custom headers for manifest, favicons. IPX image prerendering.
- **Experimental features**: `typedPages`, `asyncContext`, `inlineRouteRules`, `crossOriginPrefetch`, `buildCache`, `viteEnvironmentApi` (disabled in test). NuxtLink prefetch on interaction (not visibility).
- **Build-time version injection**: `runtimeConfig.public.version` is set from `process.env.npm_package_version` in `nuxt.config.ts`, exposing the `package.json` version to client and server at runtime.
- **Nitro**: ESBuild target `esnext`, gzip + brotli compression, minification, async context. Prerendered routes for critical above-the-fold images.
- **DNS prefetch + preconnect**: Media stream, static origin, Django, Google services
- **Source maps**: Client-side only (server disabled for smaller production bundles)
