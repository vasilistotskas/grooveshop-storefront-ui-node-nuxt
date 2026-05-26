import { DEFAULT_LOCALE } from './i18n/locales'
import { version } from './package.json'

const modules = [
  'evlog/nuxt',
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
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
        { rel: 'icon', type: 'image/png', href: '/favicon/favicon-16x16.png' },
        { rel: 'apple-touch-icon', href: '/favicon/apple-touch-icon.png' },
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
    buildDate: new Date().toISOString(),
    apiBaseUrl: process.env.NUXT_API_BASE_URL,
    mediaStreamPath: process.env.NUXT_MEDIA_STREAM_PATH,
    cacheBase: process.env.NUXT_CACHE_BASE,
    djangoUrl: process.env.NUXT_DJANGO_URL,
    secretKey: process.env.NUXT_SECRET_KEY,
    session: {
      name: 'nuxt-session',
      password: process.env.NUXT_SESSION_PASSWORD || '',
    },
    auth: {
      cookieDomain: process.env.NUXT_AUTH_COOKIE_DOMAIN,
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
    turnstile: {
      secretKey: process.env.NUXT_TURNSTILE_SECRET_KEY,
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
    scripts: {
      registry: {
        stripe: true,
      },
    },
    public: {
      appKeywords: process.env.NUXT_PUBLIC_APP_KEYWORDS,
      appLogo: process.env.NUXT_PUBLIC_APP_LOGO,
      appTitle: process.env.NUXT_PUBLIC_APP_TITLE,
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
      author: {
        github_url: process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL,
        name: process.env.NUXT_PUBLIC_AUTHOR_NAME,
      },
      djangoHostName: process.env.NUXT_PUBLIC_DJANGO_HOST_NAME,
      djangoUrl: process.env.NUXT_PUBLIC_DJANGO_URL,
      facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID,
      socials: {
        discord: process.env.NUXT_PUBLIC_SOCIALS_DISCORD,
        facebook: process.env.NUXT_PUBLIC_SOCIALS_FACEBOOK,
        instagram: process.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM,
        pinterest: process.env.NUXT_PUBLIC_SOCIALS_PINTEREST,
        reddit: process.env.NUXT_PUBLIC_SOCIALS_REDDIT,
        tiktok: process.env.NUXT_PUBLIC_SOCIALS_TIKTOK,
        twitter: process.env.NUXT_PUBLIC_SOCIALS_TWITTER,
        youtube: process.env.NUXT_PUBLIC_SOCIALS_YOUTUBE,
      },
      domainVerifyId: process.env.NUXT_PUBLIC_DOMAIN_VERIFY_ID,
      googleGsiEnable: false,
      googleSiteVerification: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      mediaStreamOrigin: process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN,
      mediaStreamPath: process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH,
      scripts: {
        googleAnalytics: {
          id: process.env.NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID,
        },
      },
      // Meta Pixel ID lives outside ``public.scripts`` because that
      // slot is typed by @nuxt/scripts itself (only registered
      // registry scripts widen its type). Putting our pixel id here
      // keeps things type-safe without a module-augmentation file.
      // The ``useMetaPixel`` composable reads from this path.
      //
      // Env var name MUST be ``NUXT_PUBLIC_META_PIXEL_ID`` (NOT
      // ``NUXT_PUBLIC_SCRIPTS_META_PIXEL_ID``) — Nuxt's runtime
      // override maps env vars to runtime config keys by uppercasing
      // and underscore-splitting the dotted path, so
      // ``runtimeConfig.public.metaPixelId`` is overridden by
      // ``NUXT_PUBLIC_META_PIXEL_ID``. Mismatched names mean the
      // build-time value is baked in (usually undefined in CI) and
      // the runtime configmap value is silently ignored.
      metaPixelId: process.env.NUXT_PUBLIC_META_PIXEL_ID,
      titleSeparator: process.env.NUXT_PUBLIC_TITLE_SEPARATOR,
      trailingSlash: String(process.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
      static: {
        origin: process.env.NUXT_PUBLIC_STATIC_ORIGIN,
      },
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      boxnowPartnerId: process.env.NUXT_PUBLIC_BOXNOW_PARTNER_ID ?? '',
      boxnowWidgetType: (process.env.NUXT_PUBLIC_BOXNOW_WIDGET_TYPE ?? 'iframe') as 'iframe' | 'popup' | 'navigate' | 'navigateen',
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
    '/favicon.ico': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=31536000',
      },
    },
    '/favicon.png': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    },
    '/logo.svg': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000',
      },
    },
    '/favicon/**': {
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
    '/_ipx/**': {
      headers: { 'cache-control': 'max-age=31536000' },
    },
    // Static pages — prerender at build time (no SSR on each request)
    '/about': { prerender: true },
    '/contact': { prerender: true },
    '/privacy-policy': { prerender: true },
    '/terms-of-use': { prerender: true },
    '/cookies-policy': { prerender: true },
    '/return-policy': { prerender: true },
    '/vision': { prerender: true },
    '/what-is-microlearning': { prerender: true },
    '/why-microlearning': { prerender: true },
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
          manualChunks(id) {
            if (
              id.includes('node_modules/leaflet/')
              || id.includes('node_modules/leaflet.markercluster/')
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
    exclude: ['/api/_nuxt_icon/**', '/api/health', '/api/__sitemap__/**'],
    transport: { enabled: true },
  },
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    debug: false,
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
  // ``@nuxtjs/leaflet`` config — markerCluster:true unlocks the
  // ``useLMarkerCluster`` composable used inside SmartpointMap.client.vue.
  // Tile providers themselves come from the carrier metadata
  // (``ShippingProvider.metadata.tile_provider``) — never hardcoded.
  leaflet: {
    markerCluster: true,
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
  },
  seo: {
    redirectToCanonicalSiteUrl: true,
  },
  sitemap: {
    sitemaps: true,
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
