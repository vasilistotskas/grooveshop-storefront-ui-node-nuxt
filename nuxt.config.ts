import type { NuxtModule } from 'nuxt/schema'
import { fileURLToPath } from 'node:url'
import { DEFAULT_LOCALE } from './i18n/locales'
import { version } from './package.json'
import { PRERENDERED_ROUTES, SWR_ROUTE_RULES } from './shared/constants/prerender'
import { FONT_FAMILY_NAMES } from './shared/theme/constants'

const modules: (string | NuxtModule)[] = [
  'evlog/nuxt',
  '@comark/nuxt',
  '@nuxt/image',
  '@nuxt/ui',
  '@nuxt/eslint',
  '@nuxt/scripts',
  '@nuxt/fonts',
  '@nuxt/icon',
  '@nuxtjs/i18n',
  '@nuxtjs/leaflet',
  '@nuxtjs/seo',
  '@pinia/nuxt',
  '@vueuse/nuxt',
  'nuxt-auth-utils',
  'nuxt-ai-ready',
  // @nuxtjs/leaflet unconditionally pushes leaflet/dist/leaflet.css into
  // the GLOBAL css array (dist/module.mjs:38, no opt-out) — a
  // render-blocking stylesheet on every page for a map that exists only
  // in checkout, and SmartpointMap.client.vue imports that css itself so
  // the global copy is a pure duplicate (Lighthouse flagged it on the
  // homepage, 2026-08-29). Inline module placed after @nuxtjs/leaflet so
  // it strips the entry the module just added.
  (_options, nuxt) => {
    nuxt.options.css = nuxt.options.css.filter(
      entry => entry !== 'leaflet/dist/leaflet.css',
    )
  },
]

if (process.env.NODE_ENV === 'test') {
  modules.push('@nuxt/test-utils/module')
}

if (process.env.NODE_ENV === 'development') {
  modules.push('@nuxt/a11y')
}

export default defineNuxtConfig({

  modules,
  $production: {
    evlog: {
      sampling: {
        rates: { info: 10, warn: 50, debug: 0, error: 100 },
        keep: [
          { status: 400 },
          { duration: 1000 },
          { path: '/api/cart/**' },
          { path: '/api/_allauth/**' },
          { path: '/api/orders/**' },
          { path: '/api/analytics/**' },
        ],
      },
    },
  },
  ssr: true,
  imports: {
    autoImport: true,
    dirs: [
      '../shared/**',
    ],
  },
  app: {
    head: {
      viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
      charset: 'utf-8',
      titleTemplate: '%s %separator %siteName',
      link: [
        // Icon links are PER-TENANT and rendered by ``setupPageHeader``
        // (platform tenant → the platform set; branded tenant → its
        // faviconUrl; unbranded tenant → none). Nothing brand-bearing
        // may live in this build-time head — it renders identically on
        // every tenant's domain. Direct requests to the static icon
        // files are tenant-gated by server/middleware/6.tenant-favicon.ts.
        { rel: 'manifest', href: '/manifest.webmanifest' },
        // DNS prefetch for external domains to reduce DNS lookup time
        { rel: 'dns-prefetch', href: process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN || 'http://localhost:3003' },
        { rel: 'dns-prefetch', href: process.env.NUXT_PUBLIC_STATIC_ORIGIN || 'http://localhost:8000' },
        { rel: 'dns-prefetch', href: process.env.NUXT_PUBLIC_DJANGO_URL || 'http://localhost:8000' },
        { rel: 'dns-prefetch', href: 'https://www.googletagmanager.com' },
        { rel: 'dns-prefetch', href: 'https://www.google-analytics.com' },
        // Preconnect for critical resources
        { rel: 'preconnect', href: process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN || 'http://localhost:3003', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: process.env.NUXT_PUBLIC_STATIC_ORIGIN || 'http://localhost:8000', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: process.env.NUXT_PUBLIC_DJANGO_URL || 'http://localhost:8000', crossorigin: 'anonymous' },
        // Preconnect to Google services (deferred but still useful for consent flow)
        { rel: 'preconnect', href: 'https://www.googletagmanager.com', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://www.google-analytics.com', crossorigin: 'anonymous' },
      ],
    },
    pageTransition: false,
    layoutTransition: false,
  },
  css: [
    '~/assets/css/main.css',
  ],
  site: {
    url: process.env.NUXT_SITE_URL,
    name: process.env.NUXT_SITE_NAME,
    description: process.env.NUXT_SITE_DESCRIPTION,
    defaultLocale: process.env.NUXT_SITE_DEFAULT_LOCALE || 'el',
  },
  colorMode: {
    preference: 'system',
    fallback: 'light',
    storage: 'cookie',
  },
  ui: {
    experimental: {
      componentDetection: true,
    },
  },
  runtimeConfig: {
    apiBaseUrl: process.env.NUXT_API_BASE_URL,
    mediaStreamPath: process.env.NUXT_MEDIA_STREAM_PATH,
    cacheBase: process.env.NUXT_CACHE_BASE,
    djangoUrl: process.env.NUXT_DJANGO_URL,
    secretKey: process.env.NUXT_SECRET_KEY,
    session: {
      name: 'nuxt-session',
      password: process.env.NUXT_SESSION_PASSWORD || '',
    },
    oauth: {
      discord: {
        clientId: process.env.NUXT_OAUTH_DISCORD_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_DISCORD_CLIENT_SECRET,
      },
      facebook: {
        clientId: process.env.NUXT_OAUTH_FACEBOOK_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_FACEBOOK_CLIENT_SECRET,
      },
      github: {
        clientId: process.env.NUXT_OAUTH_GITHUB_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET,
      },
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET,
      },
    },
    cachePurgeToken: process.env.NUXT_CACHE_PURGE_TOKEN,
    redis: {
      host: process.env.NUXT_REDIS_HOST,
      port: Number(process.env.NUXT_REDIS_PORT || 6379),
      ttl: Number(process.env.NUXT_REDIS_TTL || 3600),
      password: process.env.NUXT_REDIS_PASSWORD,
      // DB 0 = Django, DB 2 = media-stream, DB 3 = Nuxt (default)
      db: parseInt(process.env.NUXT_REDIS_DB ?? '3', 10),
    },
    public: {
      appLogo: process.env.NUXT_PUBLIC_APP_LOGO,
      appTitle: process.env.NUXT_PUBLIC_APP_TITLE,
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
      author: {
        name: process.env.NUXT_PUBLIC_AUTHOR_NAME,
      },
      djangoHostName: process.env.NUXT_PUBLIC_DJANGO_HOST_NAME,
      djangoUrl: process.env.NUXT_PUBLIC_DJANGO_URL,
      domainVerifyId: process.env.NUXT_PUBLIC_DOMAIN_VERIFY_ID,
      // Driven by NUXT_PUBLIC_GOOGLE_GSI_ENABLE (the infra ConfigMap
      // already sets it) — was hardcoded false, which silently ignored
      // the env var and made flipping it in ops a no-op.
      googleGsiEnable: process.env.NUXT_PUBLIC_GOOGLE_GSI_ENABLE === 'true',
      googleSiteVerification: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      mediaStreamOrigin: process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN,
      mediaStreamPath: process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH,
      // NOTE: no manually-set ``public.scripts.googleAnalytics`` entry —
      // the @nuxt/scripts module itself populates
      // ``runtimeConfig.public.scripts.<registryKey>`` from the top-level
      // ``scripts.registry`` config below (``defu``-merged in the
      // module's own setup step), so no plumbing is lost by omitting it
      // here. GA/Meta/TikTok pixel ids are TENANT-ONLY (``useTenantStore``)
      // — no platform/env fallback; see ``setupGoogleAnalyticsConsent``,
      // ``useMetaPixel``, ``useTikTokPixel``.
      titleSeparator: process.env.NUXT_PUBLIC_TITLE_SEPARATOR,
      static: {
        origin: process.env.NUXT_PUBLIC_STATIC_ORIGIN,
      },
      version,
    },
  },
  routeRules: {
    '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
    '/_nuxt/builds/**': {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
      },
    },
    '/assets/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/**/*.{png,jpg,jpeg,gif,avif,webp,svg,ico}': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/**/*.{css,js}': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/manifest.webmanifest': {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
    // NOTE: the legacy brand paths (/favicon.ico, /favicon.png,
    // /logo.svg, /favicon/**) are deliberately rule-FREE: they are
    // answered per-tenant by server/middleware/6.tenant-favicon.ts
    // (302/404 + its own short Cache-Control). A `cache:` rule here
    // would cache one tenant's answer under a host-agnostic key and
    // serve it to every other tenant. The real platform bytes live
    // under /platform-favicon/** below.
    '/platform-favicon/**': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Cache-Control': 'public, max-age=31536000',
      },
    },
    '/img/**': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Cache-Control': 'public, max-age=31536000',
      },
    },
    '/screenshots/**': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Cache-Control': 'public, max-age=31536000',
      },
    },
    // NOTE: /_ipx/** carries no headers route rule — the IPX handler
    // sets its own Cache-Control AFTER route-rule headers are applied,
    // so a rule here is silently dead. server/plugins/ipx-immutable.ts
    // owns that header instead.
    '/_fonts/**': {
      // Hashed, self-hosted font files — immutable.
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
    },
    // Brand-bearing static pages — SSR once per tenant, then served from
    // Nitro's cache (stale-while-revalidate). These pages read the
    // tenant store (storeName, logos, primaryDomain), so build-time
    // prerendering would bake ONE tenant's branding + a tenant-less CSP
    // into the HTML every tenant receives. `varies: ['host']` keys each
    // cache entry by tenant host; the CSP middleware runs on the first
    // request per host and its (tenant-aware, nonce-free) header is
    // cached alongside the body — self-consistent per entry. The list
    // stays in shared/constants/prerender.ts because the CSP middleware
    // still serves these routes the nonce-free 'unsafe-inline' policy:
    // one cached nonce would be reused for the whole cache lifetime,
    // pinning trust to a stale value.
    // ``x-device-class`` is stamped by server/middleware/1.device-class.ts
    // from the SAME UA classifier that seeds the SSR viewport width: the
    // markup varies by device class (hero art, mobile nav, device-aware
    // footer), so a host-only key replays one class's HTML to the others
    // (hydration mismatches; desktop hero served to phones — found live
    // 2026-08-28).
    ...Object.fromEntries(
      PRERENDERED_ROUTES.map(route => [route, {
        swr: 3600,
        cache: { varies: ['host', 'x-device-class'] },
      }]),
    ),
    // Runtime-SWR routes (homepage): same anonymous-render + nonce-free
    // CSP contract as above, shorter TTLs — see SWR_ROUTE_RULES in
    // shared/constants/prerender.ts for the rationale and the contract
    // that keeps user data out of the shared cache.
    ...Object.fromEntries(
      Object.entries(SWR_ROUTE_RULES).map(([route, ttl]) => [route, {
        swr: ttl,
        cache: { varies: ['host', 'x-device-class'] },
      }]),
    ),
  },
  sourcemap: {
    client: 'hidden',
    server: false,
  },
  future: {
    compatibilityVersion: 5,
  },
  experimental: {
    asyncContext: true,
    typedPages: true,
    inlineRouteRules: true,
    viteEnvironmentApi: process.env.NODE_ENV !== 'test',
    crossOriginPrefetch: true,
    nitroAutoImports: true,
    emitRouteChunkError: 'automatic-immediate',
  },
  compatibilityDate: 'latest',
  nitro: {
    // Dev only (ignored in production builds): same-origin `/chat` is
    // served by the agent gateway — Traefik path-routes it on the
    // storefront host in production — so proxy it to a locally running
    // gateway for `pnpm dev`.
    devProxy: {
      '/chat': {
        target: `${process.env.NUXT_AGENT_GATEWAY_URL || 'http://localhost:8090'}/chat`,
      },
    },
    prerender: {
      crawlLinks: false,
      ignore: ['/_ipx/'],
    },
    imports: {
      dirs: [
        'shared/**',
      ],
    },
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    minify: true,
    timing: false,
    experimental: {
      asyncContext: true,
    },
    // Expose the generated OpenAPI artefacts under ``/openapi/*`` so the
    // RFC 9727 API catalog at ``/.well-known/api-catalog`` has something
    // real to link to. ``schema.yml`` is the source of truth (Django
    // exports it via drf-spectacular and ``pnpm generate:schema``
    // updates it locally); ``schema.json`` is generated alongside.
    // Path is resolved from ``rootDir`` (Nuxt 4 default = repo root).
    publicAssets: [
      {
        dir: '../openapi',
        baseURL: '/openapi',
        maxAge: 3600,
      },
    ],
  },
  vite: {
    plugins: [
      // Browser bundles only: route every `import ... from 'zod'` through
      // the jitless wrapper so its `z.config({ jitless: true })` becomes a
      // module dependency of each schema module — the only ordering that
      // survives Rollup's cross-chunk import hoisting (a Nuxt plugin runs
      // too late; see app/vendor/zod-jitless.ts). A resolveId plugin is
      // used because Vite's per-environment config ($client) cannot carry
      // `resolve.alias`, and an exact-match redirect must not catch the
      // wrapper's own `zod/v4` import. SSR keeps Zod's JIT fast path.
      {
        name: 'zod-jitless-client-alias',
        enforce: 'pre',
        resolveId(id, _importer, options) {
          if (id === 'zod' && !options?.ssr) {
            return fileURLToPath(new URL('./app/vendor/zod-jitless.ts', import.meta.url))
          }
          return null
        },
      },
    ],
    vue: {
      features: {
        optionsAPI: false,
      },
    },
    optimizeDeps: {
      include: [
        '@internationalized/date',
        'zod',
        'isomorphic-dompurify',
        'lottie-web',
      ],
    },
    build: {
      rollupOptions: {
        // Silence rolldown's ``[EVAL]`` check for lottie-web only. The
        // full ``lottie-web`` build's expressions engine genuinely needs
        // direct ``eval``, so the eval path cannot be dropped by
        // switching to ``lottie_light`` without also proving no current
        // or future animation JSON relies on expressions. EVAL warnings
        // from any other module still surface.
        onwarn(warning, defaultHandler) {
          if (warning.code === 'EVAL' && warning.id?.includes('lottie-web')) {
            return
          }
          defaultHandler(warning)
        },
        output: {
          // Group Leaflet + the marker cluster plugin into a single
          // chunk so the checkout entry stays small. CRITICAL: they
          // MUST live together. ``leaflet.markercluster`` is a UMD
          // plugin whose top-level code does ``L.MarkerClusterGroup =
          // L.FeatureGroup.extend(...)`` — bare ``L`` resolved via
          // global scope (== ``window.L``). The leaflet UMD/CJS file
          // (``leaflet/dist/leaflet-src.js``) seeds ``window.L =
          // exports`` as a side effect at line 14509 of the package
          // — bundling them in the same chunk guarantees that
          // initialiser runs BEFORE the markercluster plugin's
          // top-level code, so the bare ``L`` lookup resolves.
          //
          // History: an earlier ``force-leaflet-esm`` Vite plugin
          // here mapped ``leaflet`` → ``leaflet/dist/leaflet-src.esm.js``
          // to make tree-shaking work under
          // ``future.compatibilityVersion: 5``. That ESM build does
          // NOT contain the ``window.L = exports`` line, so
          // markercluster's bare ``L`` lookup fell through to
          // ``undefined`` and crashed the page on every route that
          // preloaded the chunk (prod outage at v3.123.0/v3.123.1).
          // The plugin was removed in v3.123.2; ``leaflet`` resolves
          // to its CJS entry, which Vite pre-bundles via esbuild
          // (gives us both the default-export interop AND the
          // ``window.L`` side effect).
          //
          // The chunk only loads when ``CheckoutSmartpointMap`` is
          // mounted (Lazy* + ClientOnly), so customers who never
          // open the locker picker still pay zero bytes for it.
          //
          // ``.css`` is excluded from the matcher on purpose. The
          // leaflet stylesheets (``leaflet/dist/leaflet.css`` +
          // markercluster CSS) live under the same ``node_modules/
          // leaflet*`` paths, so without the guard they were folded
          // into this named ``leaflet`` chunk — which made Nuxt emit a
          // render-blocking ``<link rel="stylesheet">`` for it in the
          // entry HTML of EVERY page (homepage hero included, ~973ms
          // wasted on mobile), even though the map only mounts at
          // checkout. Excluding CSS lets it stay code-split with the
          // async ``SmartpointMap.client`` chunk so it loads only when
          // the locker picker mounts.
          manualChunks(id) {
            if (
              !id.endsWith('.css')
              && (
                id.includes('node_modules/leaflet/')
                || id.includes('node_modules/leaflet.markercluster/')
              )
            ) {
              return 'leaflet'
            }
          },
        },
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  debug: false,
  hooks: {
    // Trim the resource hints the SSR renderer emits (was 157
    // modulepreload + 82 prefetch links on the homepage):
    // - dynamicImports feed ONLY the rel=prefetch hint computation in
    //   vue-bundle-renderer (runtime dynamic imports resolve through the
    //   import graph, not this manifest), so emptying them drops every
    //   speculative prefetch link. Pure win.
    // - PageSection chunks are lazy-hydrated (componentRegistry.ts), so
    //   their scripts are not needed until hydrateOnVisible/Idle fires:
    //   preload:false drops their modulepreload; their CSS keeps
    //   rendering via the unconditional deps.styles set.
    // MEASURED AND REJECTED (2026-08-29, v3.164.17 on prod): dropping
    // ALL modulepreloads (nuxt-vitalizer's disablePreloadLinks). PSI
    // mobile FCP improved 4.4s -> 3.2s and LCP 6.3 -> 5.2s, but the
    // parse-discovery waterfall bunched JS execution into long tasks:
    // TBT 140-390ms -> 450-620ms, Speed Index 4.4 -> 5.8s — net score
    // NEUTRAL-to-worse. The hint knob only redistributes the cost of
    // executing the eager graph; shrinking that graph is the only real
    // lever (see the mobile-perf memory for the decomposition).
    'build:manifest': (manifest) => {
      for (const key in manifest) {
        const entry = manifest[key]
        if (!entry) continue
        entry.dynamicImports = []
        if (key.includes('components/PageSection/')) {
          entry.preload = false
        }
      }
    },
  },
  // ``nuxt-ai-ready`` exposes site content to AI agents and crawlers via:
  //   /llms.txt, /llms-full.txt   — site overview + per-page markdown
  //   /<route>.md                  — on-demand markdown of any HTML page
  //   /__ai-ready/*                — optional MCP/runtime sync endpoints
  //
  // Production deployment notes (webside.gr, K8s, 2 SSR replicas):
  //   - Prerendered routes (about, contact, policy pages, …) get full
  //     metadata indexed at build time and baked into the image dump.
  //   - SSR-rendered pages (products, blog, category pages) index on first
  //     visit per pod. Sitemap-driven URL discovery still works via
  //     ``/api/__sitemap__/urls``.
  //   - ``runtimeSync`` + ``cron`` are intentionally **disabled**: with two
  //     replicas each holding an ephemeral SQLite at ``.data/ai-ready``,
  //     scheduled background indexing would race and double-submit to
  //     IndexNow. Enable only when scaled to 1 replica or when migrating to
  //     shared storage (D1 / LibSQL / Turso).
  aiReady: {
    // Single-locale site (only ``el``). nuxt-ai-ready v1.3 ``autoI18n`` emits
    // an HTTP ``link: </>; rel="alternate"; hreflang="el-GR"`` header with a
    // **relative** href (see ``node_modules/nuxt-ai-ready/dist/runtime/server/
    // utils/link-header.js`` — never joins with site.url), which Lighthouse
    // rejects as "Relative href value" in the hreflang audit. With one locale
    // the alternate is pointing at itself anyway, so the header is pure noise.
    // Re-enable if a second locale ships AND upstream fixes the URL building.
    autoI18n: false,
    // ``contentSignal`` (Cloudflare's Content Signals Policy, CC0 — not RFC
    // 9309) would emit ``Content-Signal:`` / ``Content-Usage:`` lines into
    // robots.txt. Google added both to its unsupported-directives list in
    // April 2026, and PageSpeed/Lighthouse flags every occurrence as
    // "Unknown directive". The 25-bot user-agent groups in ``robots.groups``
    // below already gate AI access via standards-compliant Allow/Disallow.
    // Production runs as the unprivileged ``node`` user (UID 1000) with
    // ``WORKDIR=/app`` owned by root, so the default ``.data/ai-ready``
    // path under cwd is read-only. The runtime DB is ephemeral per pod
    // anyway (we don't enable ``runtimeSync``), so ``/tmp`` — always
    // writable — is the right choice.
    database: {
      filename: '/tmp/ai-ready/pages.db',
    },
  },
  cookieControl: {
    isControlButtonEnabled: false,
    cookies: {
      necessary: [
        {
          id: 'n',
          name: 'cookies.necessary',
          description: 'cookies.necessary_description',
          targetCookieIds: ['i18n_redirected', 'ncc_c', 'ncc_e'],
        },
        {
          id: 'functionality_storage',
          name: 'cookies.functionality_storage',
          description: 'cookies.functionality_storage_description',
          targetCookieIds: [],
        },
      ],
      optional: [
        {
          id: 'ad_storage',
          name: 'cookies.ad_storage',
          description: 'cookies.ad_storage_description',
          targetCookieIds: [],
        },
        {
          id: 'ad_user_data',
          name: 'cookies.ad_user_data',
          description: 'cookies.ad_user_data_description',
          targetCookieIds: [],
        },
        {
          id: 'ad_personalization',
          name: 'cookies.ad_personalization',
          description: 'cookies.ad_personalization_description',
          targetCookieIds: [],
        },
        {
          id: 'analytics_storage',
          name: 'cookies.analytics_storage',
          description: 'cookies.analytics_storage_description',
          targetCookieIds: [],
        },
        {
          id: 'personalization_storage',
          name: 'cookies.personalization_storage',
          description: 'cookies.personalization_storage_description',
          targetCookieIds: [],
        },
        {
          id: 'security_storage',
          name: 'cookies.security_storage',
          description: 'cookies.security_storage_description',
          targetCookieIds: [],
        },
      ],
    },
  },
  eslint: {
    checker: {
      eslintPath: 'eslint',
      lintOnStart: process.env.NODE_ENV !== 'production',
    },
    config: {
      stylistic: true,
    },
  },
  evlog: {
    env: { service: 'grooveshop-storefront' },
    include: ['/api/**'],
    exclude: ['/api/_nuxt_icon/**', '/api/_alive', '/api/__sitemap__/**'],
    transport: { enabled: true },
  },
  fonts: {
    // Pre-bundled per-tenant font allowlist (shared/theme/constants.ts).
    // ``global: true`` forces @font-face emission for every family even
    // though no build-time CSS references them — @font-face is lazy, so
    // each tenant's visitors download only the family their --font-sans
    // token resolves to. Files are self-hosted under /_fonts/** (no
    // runtime Google requests, no CSP widening).
    //
    // The declarations are NOT free though: the unconstrained cross
    // product (4 weights x 2 styles x up to 7 unicode-range subsets x
    // 12 families) emitted 472 @font-face rules = 169KB of the
    // render-blocking entry.css (36%, found 2026-08-29). Constrain to
    // what the platform can actually render: normal style only (italic
    // was 224 of the 472 faces; the rare .italic usage synthesizes
    // fine) and the subsets our locales (el/en/de) can produce —
    // cyrillic/vietnamese/greek-ext were dead weight on every page.
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'greek'],
    },
    families: Object.values(FONT_FAMILY_NAMES).map(name => ({
      name,
      provider: 'google',
      global: true,
    })),
  },
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    debug: false,
    // NOTE on multi-tenant SEO: i18n's ``baseUrl`` (env
    // NUXT_PUBLIC_I18N_BASE_URL) is PLATFORM-static at build time — a
    // function here does not survive the module's runtimeConfig JSON
    // serialization (verified against @nuxtjs/i18n 10.6 module.mjs:
    // options.baseUrl is defu'd into runtimeConfig.public.i18n), and
    // an empty value degrades useLocaleHead to relative links plus a
    // per-request warning. The ``tenant`` plugin therefore rewrites
    // ``public.i18n.baseUrl`` per request on Nitro's per-event
    // runtimeConfig clone (see app/plugins/tenant.ts) so SSR, the
    // serialized client payload, and nuxt-site-config's baseUrl/site
    // url comparison all see the tenant origin. The localeHead
    // rebasing in ``setupPageHeader`` (app/utils/seoHead.ts) stays as
    // defense in depth.
    restructureDir: 'i18n',
    detectBrowserLanguage: {
      useCookie: true,
      redirectOn: 'all',
      cookieKey: 'i18n_redirected',
      alwaysRedirect: false,
      cookieCrossOrigin: true,
      cookieSecure: true,
    },
    locales: [
      {
        code: 'el',
        name: 'Ελληνικά',
        files: [
          'el-GR.json',
          'auth/el-GR.json',
          'breadcrumb/el-GR.json',
          'checkout/el-GR.json',
          'cookies/el-GR.json',
          'validation/el-GR.json',
        ],
        language: 'el-GR',
        flag: '🇬🇷',
      },
    ],
    compilation: {
      strictMessage: false,
    },
    experimental: {
      localeDetector: 'localeDetector.ts',
      httpCacheDuration: 86400,
      typedPages: true,
      preload: true,
      stripMessagesPayload: true,
      // @nuxtjs/i18n 10.6.0 deep-freezes cached server messages before
      // returning them; with `preload: true` the follow-up
      // deepCopy(messages, ctx.messages) then writes into frozen arrays
      // copied by reference and every first-per-process request fails with
      // "Failed to load messages for locale" (SSR renders raw keys).
      // -1 disables that cache until the upstream freeze bug is fixed.
      cacheLifetime: -1,
    },
  },
  icon: {
    // Resolve icons against the locally-installed @iconify-json/*
    // packages (see dependencies in package.json) instead of hitting
    // a public CDN. ``externalizeIconsJson: true`` keeps cold starts
    // lean by loading icon JSONs via dynamic import at request time,
    // but Node 24 enforces ``with { type: 'json' }`` on those imports
    // and @nuxt/icon 2.2.1's externalised path doesn't emit the
    // attribute — /_nuxt_icon/*.json 500'd in production with
    // ERR_IMPORT_ATTRIBUTE_MISSING after the base image bumped to
    // node:24-alpine. Inlining the JSON into the server bundle at
    // build time avoids the runtime import entirely; slight bundle
    // bloat in exchange for icons that actually load under Node 24+.
    serverBundle: {
      externalizeIconsJson: false,
      collections: ['ant-design', 'fa-solid', 'fa6-solid', 'heroicons', 'lucide', 'heroicons-solid', 'heroicons-outline', 'mdi', 'unjs'],
    },
    // Force the CDN fallback (for icons outside the installed packs) to
    // go through the Nuxt server, not the browser. Browsers talking
    // directly to api.iconify.design tripped the site's strict
    // `connect-src` CSP; with `server-only` the fallback is a
    // same-origin request to /api/_nuxt_icon/... and the server
    // proxies upstream if needed.
    fallbackToApi: 'server-only',
    clientBundle: {
      icons: [
        'i-lucide:moon',
        'i-lucide:sun',
        'i-lucide:check',
        'i-heroicons:heart',
        'i-fa6-solid:circle-user',
        'i-fa6-solid:shield',
        'i-fa6-solid:mobile',
        'i-fa6-solid:desktop',
        'i-fa6-solid:robot',
        'i-fa6-solid:microchip',
        'i-fa6-solid:globe',
        'i-fa6-solid:network-wired',
        'i-fa6-solid:shuffle',
      ],
      scan: {
        globInclude: ['app/**/*.vue'],
        globExclude: ['node_modules', 'dist'],
      },
      sizeLimitKb: 128,
    },
  },
  image: {
    provider: 'ipx',
    format: ['avif', 'webp'],
    ipx: {
      maxAge: 60 * 60 * 24 * 365,
    },
    providers: {
      mediaStream: {
        name: 'mediaStream',
        provider: '~/providers/media-stream',
        options: {
          baseURL: process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH,
          quality: 80,
          width: 100,
          height: 100,
          fit: 'contain',
          position: 'entropy',
          background: 'transparent',
          trimThreshold: 5,
        },
      },
      // Pass-through provider: returns the URL untouched (no IPX/sharp
      // rasterization). Used via ``provider="none"`` for vector SVG logos
      // so they stay crisp instead of being rasterized to a tiny bitmap.
      none: {
        name: 'none',
        provider: 'none',
      },
    },
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },
  // ``@nuxtjs/leaflet`` config. markerCluster stays OFF: its only live
  // effect was pushing both MarkerCluster CSS files into the GLOBAL css
  // array — a render-blocking stylesheet on every page for a map that
  // exists only in checkout (flagged by Lighthouse on the homepage,
  // 2026-08-28). SmartpointMap.client.vue does not use the module's
  // ``useLMarkerCluster`` (broken in 1.3.2, bypassed via a direct
  // side-effect import) and imports both CSS files locally, so the
  // checkout map keeps its styles via its own chunk.
  // Tile providers themselves come from the carrier metadata
  // (``ShippingProvider.metadata.tile_provider``) — never hardcoded.
  leaflet: {
    markerCluster: false,
  },
  linkChecker: {
    report: {
      html: true,
      markdown: true,
    },
    debug: false,
    enabled: process.env.NODE_ENV !== 'production',
    failOnError: false,
  },
  ogImage: {
    enabled: false,
  },
  // ``@nuxtjs/robots`` (shipped via @nuxtjs/seo). Defines explicit
  // User-agent groups so RFC 9309-aware crawlers (and isitagentready.com
  // checkers) see per-bot rules in addition to the wildcard. The
  // wildcard allows all paths and Content-Signal directives, controlled
  // separately by ``aiReady.contentSignal``, opt the site into AI
  // training/search/RAG. Account/cart/checkout/api are off-limits to
  // every crawler — they're behind auth and have no value to indexers.
  robots: {
    disallow: ['/account/', '/cart', '/checkout', '/api/'],
    groups: [
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-Web',
          'anthropic-ai',
          'Google-Extended',
          'PerplexityBot',
          'Perplexity-User',
          'Applebot-Extended',
          'Bytespider',
          'Amazonbot',
          'Meta-ExternalAgent',
          'Meta-ExternalFetcher',
          'CCBot',
          'cohere-ai',
          'Diffbot',
          'DuckAssistBot',
          'PetalBot',
          'YouBot',
          'Timpibot',
          'ImagesiftBot',
          'omgili',
          'omgilibot',
          'FriendlyCrawler',
        ],
        allow: ['/'],
        disallow: ['/account/', '/cart', '/checkout', '/api/'],
      },
    ],
  },
  schemaOrg: {
    enabled: true,
    minify: true,
  },
  scripts: {
    assets: {
      integrity: 'sha384',
    },
    // Registry entries are infrastructure-only (types, env-var runtime
    // config, bundling). ``trigger: false`` is the documented v1 form
    // for composable-driven scripts: a bare ``{}`` makes the registry
    // plugin initialize the script instance at boot and every later
    // ``useScript*`` call reuses that instance IGNORING its own
    // options — which silently dropped the consumers' id/trigger/
    // defaultConsent and killed GA page tracking (2026-07-12).
    // ``proxy: false`` on EVERY entry keeps the module's first-party
    // proxy infrastructure fully disabled (``anyNeedsProxy`` in the
    // module is computed ONLY from these registry entries). With the
    // proxy on, the bundler AST-rewrites vendor URLs inside bundled
    // scripts to ``/_scripts/p/<domain>`` — but the runtime allowlist
    // only covers registry-registered domains, so non-registry bundled
    // scripts (Meta/TikTok pixels) chain-loaded resources that 403'd
    // ("Domain not allowed") and were refused by strict MIME checking
    // (prod 2026-07-12). Composable-level opt-outs CANNOT fix this:
    // ``isProxyDisabled`` reads exclusively from these config entries.
    registry: {
      // bundle:false — registry bundling fetches gtag at IMAGE BUILD
      // time with whatever id the build env carries, baking one
      // tenant's GA container config into the shared image. Analytics
      // are per-tenant: load from the vendor at runtime instead.
      googleAnalytics: { trigger: false, proxy: false, bundle: false },
      stripe: { trigger: false, proxy: false },
    },
  },
  seo: {
    // The module's canonical redirect runs as MODULE middleware —
    // before 4.tenant-site-config pushes the per-tenant URL — so it
    // compared every host against the env-frozen platform site URL
    // and 301'd every other tenant's storefront onto tenant #1's
    // domain. server/middleware/5.tenant-canonical.ts is the
    // tenant-aware replacement.
    redirectToCanonicalSiteUrl: false,
  },
  sitemap: {
    // Single-sitemap mode (a plain <urlset> at /sitemap.xml). ``true``
    // produced a /sitemap_index.xml + per-locale /__sitemap__/el-GR.xml
    // split — pointless at ~110 URLs / one locale (chunking matters
    // near the 1k-per-sitemap default), and it broke nuxt-ai-ready's
    // sitemap discovery: @nuxtjs/sitemap v8 moved the ``sitemaps`` map
    // out of runtimeConfig into a virtual module, so nuxt-ai-ready
    // falls back to probing /sitemap.xml, which in index mode is a 307
    // redirect it can't parse → /llms.txt shipped with NO pages list.
    // Must stay explicitly ``false``: the i18n auto-mapping only backs
    // off when ``sitemaps !== false`` fails, an absent key re-enables
    // the per-locale split. robots.txt Sitemap: line updates itself.
    sitemaps: false,
    // No XSLT stylesheet. nuxt-sitemap defaults ``xsl`` to
    // ``/__sitemap__/style.xsl`` and injects a
    // ``<?xml-stylesheet type="text/xsl"?>`` PI into /sitemap.xml so a
    // human sees a styled table. But Chrome is REMOVING XSLT: the
    // kill-switch already ships to Stable via field trials (seen live on
    // Chrome 151) ahead of the hard removal in Chrome 158 (2026-11-17),
    // and Firefox/WebKit have announced the same. With XSLT disabled the
    // browser refuses the transform AND its own native XML pretty-viewer
    // (itself XSLT-based) dies too — so the PI leaves a BLANK white page.
    // Dropping the PI lets the browser fall back to raw-XML rendering
    // (visible, if unstyled). Crawlers never used the stylesheet, so SEO
    // is unaffected. The styling was cosmetic; a dead-on-arrival
    // dependency is not worth keeping.
    xsl: false,
    exclude: [
      '/account',
      '/account/2fa',
      '/account/2fa/**',
      '/account/addresses',
      '/account/addresses/**',
      '/account/email',
      '/account/favourites/**',
      '/account/help',
      '/account/orders',
      '/account/orders/**',
      '/account/password/change',
      '/account/provider/**',
      '/account/providers',
      '/account/reviews',
      '/account/sessions',
      '/account/settings',
      '/account/reauthenticate',
      '/cart',
      '/checkout',
      '/feedback',
      '/return-policy',
    ],
    sources: [
      '/api/__sitemap__/urls',
    ],
    cacheMaxAgeSeconds: 60 * 60 * 24, // 24 hours
  },
})
