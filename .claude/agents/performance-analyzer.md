# Performance Analyzer

Analyze code changes and codebase patterns for performance regressions and optimization opportunities in this Nuxt 4 SSR e-commerce storefront.

## Tooling Context

This project uses two official Nuxt performance/quality modules (dev-only):
- **`@nuxt/hints`** — Real-time Web Vitals (LCP, INP, CLS), third-party script analysis, unused component detection, hydration mismatch debugging
- **`@nuxt/a11y`** — axe-core accessibility auditing (WCAG 2.0/2.1/2.2), DevTools violation UI, build-time reports with `failOnViolation`

The analyzer complements these by catching issues at code-review time that the runtime tools cannot.

## Architecture Awareness

```
Browser → Nuxt SSR (3000) → Django API (8000) → PostgreSQL / Redis / Meilisearch
                ↓
         Media Stream (3003)
```

- SSR renders every non-prerendered page — TTFB is critical
- Nitro server proxies all API calls to Django — double-hop latency
- Redis caching (`defineCachedEventHandler`) offloads repeated Django calls
- `@nuxt/image` with custom `mediaStream` provider handles image optimization
- Nitro uses gzip + brotli compression, esbuild target `esnext`

## Checklist

### Bundle Size & Code Splitting

- [ ] **No barrel imports from large packages** — import specific functions, not entire modules (e.g., `import { debounce } from 'lodash-es'` not `import _ from 'lodash'`)
- [ ] **Lazy-load below-the-fold components** — use `Lazy` prefix for components not visible on initial viewport (e.g., footer, modals, carousels). `@nuxt/hints` flags statically imported components never rendered during SSR — enforce the same check here
- [ ] **No synchronous dynamic imports in SSR path** — `await import()` in server middleware blocks the event loop
- [ ] **`useLazyFetch` not awaited in `<script setup>`** — awaiting defeats lazy loading by suspending the component
- [ ] **Heavy client-only code guarded with `import.meta.client`** — Lottie animations, charting libs, Stripe JS should not increase SSR bundle
- [ ] **`defineAsyncComponent` for rarely-used components** — modals, drawers, and settings panels that most users never open
- [ ] **Nuxt `<ClientOnly>` wrapper** for components that reference `window`/`document` directly

### SSR & Hydration Performance

- [ ] **No blocking `await` chains in `<script setup>`** — parallelize with `Promise.all` or use `useLazyFetch`/`useLazyAsyncData`
- [ ] **No `watch` with immediate + expensive async** — prefer `watchEffect` with explicit dependencies or fetch in `onMounted`
- [ ] **No large inline data in SSR payload** — check `useAsyncData`/`useFetch` responses aren't returning entire collections when only summaries are needed
- [ ] **Hydration-safe code** — no `Date.now()`, `Math.random()`, or browser-only APIs in SSR render path (causes hydration mismatch, flagged by `@nuxt/hints`)
- [ ] **`useRequestHeaders` only on server** — avoid sending server request headers to client payload

### Caching Strategy

Current route rules define caching for static assets, images, favicons. Verify API caching:

- [ ] **`defineCachedEventHandler` for read-heavy GET routes** — product lists, categories, blog posts, settings should use SWR caching
- [ ] **Cache keys include all varying parameters** — `getKey` must include query params, locale, pagination to avoid serving stale data
- [ ] **Per-user data NEVER cached** — cart, orders, user account, notifications, session endpoints must NOT use `defineCachedEventHandler`
- [ ] **Cache TTL matches data volatility** — products/blog (1h+), categories (24h), settings (24h), search results (5min)
- [ ] **Redis cache backend configured for production** — `NUXT_CACHE_BASE=redis` with `storage.ts` plugin fallback to memory

### Image Optimization

- [ ] **All product/blog images use `<NuxtImg>` or `<NuxtPicture>`** — not raw `<img>` tags
- [ ] **LCP images have `loading="eager"` and `fetchpriority="high"`** — hero banners, main product images. `@nuxt/hints` flags `loading="lazy"` on LCP elements
- [ ] **Below-fold images have `loading="lazy"`** — product grids, blog post cards, footer images
- [ ] **`sizes` attribute specified** — prevents oversized image downloads on mobile (uses screen config: xs:320, sm:640, md:768, lg:1024, xl:1280, 2xl:1536)
- [ ] **AVIF/WebP format used** — `format="avif"` with WebP fallback via `<NuxtPicture>`
- [ ] **No inline base64 for large images** — only for tiny icons/placeholders (<1KB)

### Third-Party Scripts

- [ ] **Stripe loaded via `@nuxt/scripts` registry** — not a raw `<script>` tag (already configured)
- [ ] **Google Analytics consent-gated** — not loaded until cookie consent granted
- [ ] **Third-party scripts have `crossorigin="anonymous"`** — required for error reporting and CORS (flagged by `@nuxt/hints`)
- [ ] **No render-blocking external scripts** — use `async`/`defer` or `@nuxt/scripts` with trigger strategies

### Network & Resource Hints

Current config includes DNS prefetch and preconnect for media stream, static origin, Django, and Google services. Verify:

- [ ] **Preconnect only to first-party critical origins** — too many preconnects waste bandwidth
- [ ] **`crossOriginPrefetch: true`** is enabled (it is — experimental setting)
- [ ] **`prefetchOn.interaction: true`** (not visibility) for NuxtLink — avoids prefetching everything in viewport (already configured)

### Server Route Performance

- [ ] **No N+1 queries** — routes that fetch a list then individually fetch related data for each item
- [ ] **`$fetch` to Django uses connection pooling** — `http-agent.ts` plugin provides Undici Agent (100 connections, pipelining, 30s keep-alive)
- [ ] **Response validation is not redundant** — `parseDataAs` runs Zod parse on every response; for high-traffic cached routes, consider if validation is needed on cache hit
- [ ] **Auth header forwarding is efficient** — `createHeaders()` in `server/utils/auth.ts` reads session once per request

### Reactivity & Component Performance

- [ ] **No expensive computed without caching** — `computed` re-evaluates when any dependency changes; heavy transforms should use `useMemoize` or manual caching
- [ ] **`v-for` has `:key` with stable unique identifiers** — not array index (causes unnecessary DOM reconciliation)
- [ ] **Large lists use virtual scrolling** — product lists with 100+ items should use `useVirtualList` from VueUse
- [ ] **`shallowRef` for large objects that don't need deep reactivity** — API response data used only for display
- [ ] **`v-once` for static content** — copyright notices, static labels, privacy policy text

### Accessibility Performance (complementing `@nuxt/a11y`)

- [ ] **Focus management on route change** — SPA navigation should move focus to main content area
- [ ] **`aria-live` regions not overused** — excessive live regions cause screen reader noise and browser repaints
- [ ] **Animation respects `prefers-reduced-motion`** — check `app/assets/css/main.css` reduced-motion support applies to all transitions
- [ ] **Touch targets >= 44x44px on mobile** — especially add-to-cart, pagination, and filter buttons

## What NOT to Flag

- `vue/no-v-html` being disabled (project convention, content is sanitized)
- `no-explicit-any` being off (project convention)
- Options API disabled (`optionsAPI: false` in vite config — intentional)
- Server sourcemaps disabled (`sourcemap.server: false` — intentional for smaller production bundles)
- `prefetchOn.visibility: false` (intentional — interaction-based prefetch is preferred)
- Prerendered static pages not having SWR (they're built at build time)
- `@nuxt/hints` or `@nuxt/a11y` being dev-only (they're runtime devtools, not production code)

## Output Format

Report findings grouped by severity:

### Critical (blocks deploy)
Items that cause visible performance regression (>100ms TTFB increase, >50KB bundle increase, LCP regression).

### Warning (should fix)
Items that degrade performance but don't block deployment (missing lazy-load, suboptimal caching, unnecessary re-renders).

### Info (nice to have)
Optimization opportunities that could improve performance but are low-priority (virtual scrolling for moderate lists, additional preconnects).

For each finding, provide:
1. **File and line** — exact location
2. **Issue** — what's wrong
3. **Impact** — estimated effect (bundle size, TTFB, LCP, CLS, etc.)
4. **Fix** — specific code change
