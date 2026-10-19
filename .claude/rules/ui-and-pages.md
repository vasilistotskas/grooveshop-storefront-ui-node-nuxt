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
- `auth` — Login/signup flows, as their page files name it (and as webside renders them)
- `auth-split` — The Volt sign-in frame: the store's ink panel beside the form on desktop, a back button and logo over it on a phone. Page files cannot name it per store, so `design-layout.global.ts` swaps it in for every sign-in, sign-up and re-authentication page (`isAuthPageRoute`) of a tenant `resolveLayout('auth', schema)` puts on Volt

## Middleware

- `01.design-only.global.ts` — Global, and first (the `01.` prefix sorts it before every other global middleware): 404s the redesign-only pages (`REDESIGN_ONLY_PAGES`) on a store frozen in the previous design
- `auth.global.ts` — Global: redirects unauthenticated users from protected routes
- `identity.global.ts` — Global: hydrates identity/session state
- `design-layout.global.ts` — Global: the layout a tenant's design draws a kind of page in (`resolveLayout` in `variantRegistry.ts`); `setPageLayout` is how a middleware overrides the layout a page file fixed at build time
- `locale-available.global.ts` — Global: 404s a locale prefix the tenant does not serve (`servedLocale`, `Tenant.available_locales`); fails open until the tenant config has resolved
- `guest.ts` — Prevents logged-in users from accessing login/signup pages
- `<feature>-enabled.ts` (`blog`, `loyalty`, `promotions`, `gift-cards`, `favourites`, `newsletter`, `feedback`, `account-reviews`, `b2b`) — each is one line, `createFeatureGate(<its StoreFeatures name>)` (`app/utils/routeGate.ts`; `b2b-enabled.ts` gates `wholesale`): a hard 404 unless `TenantConfig.features` has that feature. Synchronous, no request, no fallback
- `cart-enabled.ts`, `catalogue-enabled.ts` — `createPreferenceGate`: the two settings that are not store features yet (see "Store features" below)

## Failed calls: the server's reason

A failed `$api` call tells the shopper why, in the page's language, from Django's error body (`docs/error-contract.md` in the Django repo: `detail` or the field keys, a stable `code`, and for validation `fields: { field: [{ message, code }] }`). Never a sentence the component wrote in advance, never `error.message` / `statusMessage` (English transport text), and never a comparison against translated text.

- `describeApiError(error, { title?, reason?, fallback? })` (`app/utils/apiError.ts`) → `{ title, description, code, fieldErrors, requestId, status, serverFault }`. It reads both client shapes (a forwarded body is `error.data`, a thrown route error wraps it as `error.data.data`) until every Nitro route forwards. Text priority: `errors.codes.<code>` in the locale files, then `reason` (a typed refusal the component can explain better), then Django's message, then `fallback`, then a generic line: "something went wrong on our side" for a 5xx or no answer, "not accepted" otherwise.
- `useApiError().notify(id, error, { title, fallback })` toasts it: the action's headline, the reason, and behind «Λεπτομέρειες» the code and the request id. The id is the ACTION's (`review:create`), so a repeated failure pulses one toast instead of stacking.
- `useApiFormErrors(form, { fields }).reportFailure(id, error, { title })` for a form: errors on fields the form renders go under their inputs (`UForm.setErrors`), anything else is a toast. `useSavedAddressErrors` adds checkout's hidden-field handling on top of the same `formErrorsOf`.
- A failure that blocks a step (checkout, payment) stays on the page: `useCheckoutSubmit().submitError` shown by `<ApiErrorAlert>`, because a toast times out.
- `test/unit/source-rules/errors-go-through-the-helper.spec.ts` fails on a hand-written `toast.add({ …, color: 'error' })` in a `catch`.
- A code the storefront should say in its own words gets an `errors.codes.<code>` entry in `el-GR.json` and `en-US.json`. Codes are Django's identifiers; never branch on a translated message.

## Store features

`TenantConfig.features` is Django's effective state of each optional feature (its plan flag AND its store settings; Django's `docs/store-features.md`). **The storefront reads it and nothing else**: `useStoreFeature('loyalty')` in a component, composable or route middleware, `eventStoreFeature(event, 'blog')` in a Nitro route, `storeFeatureOn(tenant, name)` where there is only a tenant (`shared/utils/storeFeature.ts`). The feature names come from the generated `StoreFeatures` type. Never combine a plan flag with a setting, copy a setting's default, or keep a fail-open or fail-closed fallback for a feature: the answer is already in the tenant payload, so it is known on the server, costs no request and cannot be "unreadable". Gate a feature's request with `enabled: useStoreFeature(...)`, never `immediate` (see "Gate the request" in `CLAUDE.md`).

The settings that remain are read through ONE typed accessor, `useStorePreference(name)` (`storePreferenceEnabled(name)` outside a component), whose `STORE_PREFERENCES` table (`shared/utils/storePreference.ts`) holds each key and what a missing row means: the presentation preferences (`MOBILE_BOTTOM_NAV`, `STICKY_ADD_TO_CART`, `RECENTLY_VIEWED`, `DEMO_ACCOUNT`) and `CART_ENABLED` / `CATALOGUE_ENABLED`, which Django's API does not gate yet (gateway-first follow-up, grooveshop-agent-gateway issue 27; when they join `features`, their rows leave the table). `app/components/variants/webside/**` is frozen and keeps its own `useSettingFlag` / plan-flag reads; `shared/utils/gatedRoutes.ts` is the one table the sitemap and the menus read.

(Page/layout transitions are disabled globally in `nuxt.config.ts` via `app.pageTransition: false` / `layoutTransition: false` — no middleware needed.)

## Pages (Routing)

Routes in `app/pages/`: home, products (with category/detail), blog (with category/post), cart, checkout (with success), search, account (extensive sub-routes for auth/2FA/profile/orders/favourites/reviews/subscriptions/loyalty/settings), and static content pages. See `app/pages/` for full structure.

**Every public page file is a thin shell.** It keeps only what Nuxt extracts from
page files at build time — `definePageMeta` (layout, middleware, `validate`) and
`defineRouteRules` (`robots: false`) — and renders
`resolvePage('<key>', tenantStore.schemaName)` from `app/utils/variantRegistry.ts`.
The body (data fetching, 404/503 normalisation, `useSeoMeta`/`useSchemaOrg`, the
template and its `<i18n>` block) lives in `app/components/Storefront/<Body>.vue`;
a tenant that keeps or specifies its own design registers `page:<key>@<schema>`
pointing at `app/components/variants/<schema>/…`. Four-of-a-kind pages share one
body and pass the constant that told them apart as a prop (`Legal.vue` takes
`route`, `BrandPage.vue` takes `pageType`). Chrome resolves the same way:
`resolveChrome('navbar' | 'footer' | 'mobile_nav' | 'checkout_header' | 'account_shell', schema)`
in the layouts (`account_shell` is the signed-in account pages' frame: banner +
sidebar). Never put `definePageMeta`/`defineRouteRules` in a body (they are
inert outside `pages/`), and never put visitor-facing markup in a shell.
ESLint enforces both across bodies and pages (`eslint.config.mjs`: page macros are banned under `app/components/**`, and an un-awaited `usePageConfig` anywhere in `app/**`).

**`localePath` takes a route name or a location, never a path string.** With
typed pages, `@nuxtjs/i18n` types its argument as a name from `RouteMapI18n`
or a location object; a path string still works at runtime only for backwards
compatibility. A fixed destination is a name (`localePath('products')`,
`localePath('account-login')`); a URL builder's result is `{ path: productUrl(…) }`;
a path known only at runtime (CMS/menu links, notification targets, breadcrumb
`to`) goes through `pathLocation()` (`app/utils/route.ts`), which keeps its
`?query` and `#hash`. A bare `{ path }` would drop them, because vue-router
keeps only the pathname of `path`.

## The frozen `webside` tree

`app/components/variants/webside/**` is the storefront webside.gr renders
**today**, frozen byte-for-byte while the platform defaults are redesigned. It is
registered in `nuxt.config.ts` with the auto-import prefix `Webside`, so a frozen
component that renders `<ProductCard>` would silently pick up the NEW default —
inside that tree every reference to another frozen component carries the prefix
(`<WebsideProductCard>`, `<LazyWebsideSearchInput>`,
`resolveComponent('WebsideBlogPostCardMobile')`). References to SHARED components
(`Anchor`, `ImgWithFallback`, `TenantLogo`, `DynamicForm`, `Cookie*`, `Chat*`,
`MobileOrTabletOnly`, `DesktopOnly`, `FormPhoneInput`, `FormCountryFlag`, `UserAvatar`,
Stripe/Viva glue, the locker/map pickers, `U*`) stay unprefixed.

The account area, the re-auth pages and the newsletter confirmation were frozen
later than the rest. Where a default had drifted from its first frozen copy by
then, the version those pages rendered is frozen apart under
`variants/webside/AccountArea/` (`WebsideAccountAreaProductCard`,
`WebsideAccountAreaPageWrapper`, …) — those copies are for those pages only.

**Reviews are the exception (owner decision 2026-10-17, storefront #165).**
Webside's product page, its product cards (`Product/Card`, `Product/Suggestions`,
`AccountArea/Product/Card`, `Storefront/Account/OrderDetail`) and its "My reviews"
page mount the shared review components, styled in webside's own tokens (zinc
primary, `--ui-secondary`, the system face, the tenant theme's radius), so a
reviews fix lands once for every store. `page:account-reviews@webside` is only
webside's page frame (`AccountArea/Page/Reviews.vue`) around the platform body.
A shared review component styles itself with tokens and Nuxt UI classes, never a
`--volt-*` variable, and a webside-specific touch is a prop or a slot, never a
copy. `test/unit/source-rules/reviews-are-one-implementation.spec.ts` fails the
day a webside file draws its own stars or a review component returns.

Rules:

- **Never edit a file in that tree** except to fix a webside-only bug, and never
  to restyle, translate or refactor it. Its output is pinned by
  `test/nuxt/variants/webside/frozen-render.spec.ts`, whose snapshots were
  captured before the freeze.
- Its Greek-only `<i18n>` blocks are excluded from the translation debt list on
  purpose (`test/unit/source-rules/inline-blocks.spec.ts`): adding a locale would change
  that store's render.
- `test/unit/source-rules/webside-isolation.spec.ts` fails on an unprefixed
  reference; `test/unit/app/utils/variantRegistry.spec.ts` fails when a page or
  chrome key loses its `@webside` entry, which would hand webside the redesign.
- A tenant that wants its own design registers `page:<key>@<schema>` /
  `chrome:<slot>@<schema>` the same way (Δelta Σigma ships only chrome).

## Component Categories

Components in `app/components/` organized by domain:
- **Account** — Login/Signup forms, 2FA flows (TOTP, WebAuthn, recovery codes), email/password/sessions/providers management, settings, auth navigation; the account pages' PageHeader and the favourites tabs. The signed-in frame is `Chrome/AccountShell.vue` (band + sidebar, mounted by `default.vue` on account routes), its navigation `useAccountNavigation` (the frozen webside tree keeps `useAccountMenus`), its figures one BFF request (`server/api/user/account/summary.get.ts`)
- **Blog** — Post lists/carousels, comments (with likes), categories, tags, content renderer
- **Cart** — Cart button (with item count), item cards
- **Checkout** — Items list
- **Cookie** — GDPR consent modal/control
- **DynamicForm** — Multi-step form system
- **Loyalty** — PointsBadge, RewardsCard (the account overview's), Summary, TierSystem, ProgressHero, Transactions, Redemption
- **Order** — Progress (the five-step strip), StatusBadge, Thumbs — the account's order rows and order page (`app/utils/orderStatus.ts` holds the flow and the status tints)
- **Product** — the product page's parts (Images/ImageModal gallery and zoom, VariantSelector, Offers, NotifyMe alerts dialog, Review sheet, Suggestions grid), Favourites, CardSkeleton, Categories slider. **Reviews is one implementation for every store, webside included** (below): `Reviews/Section` (id `reviews`: summary, write button, list, the sheet), `Reviews/Overview`, `Reviews/List` (sort, show all, load more), `Reviews/Item`, `Reviews/Stars`, `Reviews/StatusBadge`, `Product/Rating` (the "4.3 · 12" quote on cards and beside the title) and `Review.vue` (the write/edit sheet: `UDrawer` below `sm`, `UModal` from it up, chosen by `useDevice`)
- **Products** — the listing (Header, CategoryChips, Browse, List, Toolbar, Sidebar, Pagination, Filters: CategoryTree, AttributeValues, PriceRange, ActiveFilters) and the Rail of product cards
- **Search** — Input, Modal, Result
- **User** — Avatar, NotificationsBell
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

- **`@nuxtjs/seo`** suite: sitemap (dynamic via `/api/__sitemap__/urls`, excludes account/cart/checkout routes, cached per host in Redis by the `/sitemap.xml` route rule, purged by Django), OG Image disabled, Schema.org (minified), link checker (non-production). The module's canonical redirect is off (`seo.redirectToCanonicalSiteUrl: false`); `server/middleware/5.tenant-canonical.ts` enforces each tenant's canonical host
- **Route rules**: Immutable caching for `/_nuxt/**`, static assets, images, CSS/JS. CORS for `/api/**`. Custom headers for manifest, favicons. IPX image prerendering.
- **Experimental features**: `typedPages`, `asyncContext`, `inlineRouteRules`, `crossOriginPrefetch`, `nitroAutoImports` (kept until evlog's `log` works without it), `emitRouteChunkError: 'automatic-immediate'`.
- **Build-time version injection**: `runtimeConfig.public.version` is set from `process.env.npm_package_version` in `nuxt.config.ts`, exposing the `package.json` version to client and server at runtime.
- **Nitro**: ESBuild target `esnext`, gzip + brotli compression, minification, async context. Prerendered routes for critical above-the-fold images.
- **Resource hints**: per-tenant media-stream/static origin hints rendered at runtime by `setupPageHeader`; none in the build-time head and no Google hints.
- **Source maps**: Client-side only (server disabled for smaller production bundles)
