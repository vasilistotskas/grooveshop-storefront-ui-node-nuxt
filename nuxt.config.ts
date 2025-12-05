export default defineNuxtConfig({

  modules: [
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    '@nuxt/scripts',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/i18n',
    '@nuxtjs/device',
    '@nuxtjs/seo',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
  ],
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
    redis: {
      host: process.env.NUXT_REDIS_HOST,
      port: Number(process.env.NUXT_REDIS_PORT),
      ttl: Number(process.env.NUXT_REDIS_TTL),
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
      apiBaseUrl: process.env.NUXT_API_BASE_URL,
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
      titleSeparator: process.env.NUXT_PUBLIC_TITLE_SEPARATOR,
      trailingSlash: String(process.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
      static: {
        origin: process.env.NUXT_PUBLIC_STATIC_ORIGIN,
      },
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
  },
  routeRules: {
    '/': { prerender: true },
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
    '/**/*.{png,jpg,jpeg,gif,webp,svg,ico}': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/**/*.{css,js}': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/api/**': { cors: true },
    '/manifest.webmanifest': {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
    '/favicon.ico': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'max-age=31536000',
      },
    },
    '/favicon.png': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'max-age=31536000',
      },
    },
    '/logo.svg': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'max-age=31536000',
      },
    },
    '/favicon/**': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Cache-Control': 'max-age=31536000',
      },
    },
    '/img/**': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Cache-Control': 'max-age=31536000',
      },
    },
    '/screenshots/**': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Cache-Control': 'max-age=31536000',
      },
    },
    '/_ipx/**': {
      headers: { 'cache-control': 'max-age=31536000' },
      prerender: true,
    },
    '/index': { redirect: '/' },
  },
  sourcemap: process.env.NODE_ENV !== 'production',
  future: {
    compatibilityVersion: 5,
  },
  experimental: {
    typedPages: true,
    asyncContext: true,
    cookieStore: true,
    payloadExtraction: true,
    inlineRouteRules: true,
    checkOutdatedBuildInterval: 5 * 60 * 1000,
    viteEnvironmentApi: true,
    componentIslands: true,
    crossOriginPrefetch: true,
    buildCache: true,
    defaults: {
      nuxtLink: {
        prefetchOn: {
          visibility: false,
          interaction: true,
        },
      },
    },
  },
  compatibilityDate: 'latest',
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [
        '/_ipx/q_80&s_145x30/img/logo-navbar.svg',
        '/_ipx/f_webp&q_80&fit_cover&s_1194x418/img/main-banner.png',
        '/_ipx/f_webp&q_80&fit_cover&s_510x638/img/main-banner-mobile.png',
      ],
    },
    esbuild: {
      options: {
        target: 'esnext',
      },
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
  },
  vite: {
    build: {
      cssCodeSplit: true,
      cssMinify: 'lightningcss',
      minify: 'esbuild',
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  debug: false,
  cookieControl: {
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
    checker: true,
    config: {
      stylistic: true,
    },
  },
  i18n: {
    defaultLocale: 'el',
    debug: false,
    restructureDir: 'i18n',
    detectBrowserLanguage: {
      useCookie: true,
      redirectOn: 'all',
      cookieKey: 'i18n_redirected',
      alwaysRedirect: true,
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
          'cookies/el-GR.json',
          'validation/el-GR.json',
        ],
        language: 'el-GR',
        flag: '🇬🇷',
      },
    ],
    vueI18n: './i18n.config.mts',
    compilation: {
      strictMessage: false,
    },
    experimental: {
      httpCacheDuration: 86400, // 1 day
    },
  },
  icon: {
    serverBundle: {
      remote: true,
      externalizeIconsJson: true,
      collections: ['ant-design', 'fa-solid', 'fa6-solid', 'heroicons', 'lucide', 'heroicons-solid', 'heroicons-outline', 'mdi', 'unjs'],
    },
    clientBundle: {
      icons: [
        'i-lucide:moon',
        'i-lucide:sun',
        'i-heroicons:heart',
        'i-fa6-solid:circle-user',
      ],
      scan: {
        globInclude: ['components/**/*.vue', 'app/**/*.vue', 'pages/**/*.vue', 'layouts/**/*.vue'],
        globExclude: ['node_modules', 'dist'],
      },
      sizeLimitKb: 128,
    },
  },
  image: {
    provider: 'ipx',
    ipx: {
      maxAge: 60 * 60 * 24 * 365,
    },
    presets: {
      default: {
        modifiers: {
          format: 'webp',
        },
      },
    },
    providers: {
      mediaStream: {
        name: 'mediaStream',
        provider: '~/providers/media-stream',
        options: {
          format: 'webp',
          quality: 80,
          width: 100,
          height: 100,
          fit: 'contain',
          position: 'entropy',
          background: 'transparent',
          trimThreshold: 5,
          // baseURL can be overridden here if needed
        },
      },
    },
    screens: {
      'xs': 320,
      'sm': 640,
      'md': 768,
      'lg': 1024,
      'xl': 1280,
      'xxl': 1536,
      '2xl': 1536,
    },
  },
  linkChecker: {
    report: {
      html: true,
      markdown: true,
    },
    debug: process.env.NODE_ENV !== 'production',
    enabled: true,
  },
  ogImage: {
    defaults: {
      cacheMaxAgeSeconds: 60 * 60 * 24 * 7 * 1000, // 7 days
    },
  },
  schemaOrg: {
    enabled: true,
    minify: true,
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
      '/products',
      '/return-policy',
    ],
    sources: [
      '/api/__sitemap__/urls',
    ],
    cacheMaxAgeSeconds: 60 * 60 * 24, // 24 hours
    runtimeCacheStorage: {
      driver: 'redis',
      port: 6379,
      host: 'redis-standalone',
      db: 0,
    },
  },
})
