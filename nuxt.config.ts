import AutoImport from 'unplugin-auto-import/vite'

const sw = process.env.SW === 'true'

export default defineNuxtConfig({
  compatibilityDate: '2024-09-19',
  ssr: true,
  debug: false,
  sourcemap: {
    server: false,
    client: true,
  },
  telemetry: false,
  future: {
    compatibilityVersion: 4,
    typescriptBundlerResolution: true,
  },
  features: {
    inlineStyles: true,
  },
  app: {
    head: {
      viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
      charset: 'utf-8',
      templateParams: {
        separator: '-',
      },
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
        { rel: 'apple-touch-icon', href: '/favicon/apple-touch-icon.png' },
      ],
    },
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL,
    name: process.env.NUXT_PUBLIC_SITE_NAME,
    description: process.env.NUXT_PUBLIC_SITE_DESCRIPTION,
    defaultLocale: process.env.NUXT_PUBLIC_DEFAULT_LOCALE,
  },
  modules: [
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    '@nuxt/scripts',
    '@nuxtjs/i18n',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/device',
    '@nuxtjs/seo',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@vee-validate/nuxt',
    'nuxt-auth-utils',
    'nuxt-time',
    'nuxt-vitalizer',
    'nuxt-security',
  ],
  routeRules: {
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
    '/favicon/**': {
      cache: {
        maxAge: 60 * 60 * 24 * 365,
      },
      headers: {
        'Cache-Control': 'max-age=31536000',
      },
    },
    'img/**': {
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
    '/_ipx/**': { headers: { 'cache-control': 'max-age=31536000' } },
  },
  build: {
    transpile: ['@iconify', '@unocss', '@unhead'],
  },
  imports: {
    autoImport: true,
    dirs: [
      'stores/**',
    ],
  },
  experimental: {
    componentIslands: true,
    inlineRouteRules: true,
    typedPages: true,
    renderJsonPayloads: true,
    asyncContext: true,
    cookieStore: true,
    watcher: (process.env.NUXT_PUBLIC_EXPERIMENTAL_WATCHER || 'parcel') as
    | 'chokidar'
    | 'chokidar-granular'
    | 'parcel'
    | undefined,
  },
  devtools: {
    enabled: process.env.NODE_ENV !== 'production',
    timeline: { enabled: false },
  },
  typescript: {
    strict: true,
    typeCheck: false, // Until vue-tsc is fixed
    builder: 'vite',
  },
  tailwindcss: {
    cssPath: ['~/assets/sass/tailwind.scss', { injectPosition: 'first' }],
    configPath: './tailwind.config.mjs',
    exposeConfig: {
      level: 1,
    },
    viewer: true,
  },
  i18n: {
    strategy: 'prefix_except_default',
    lazy: true,
    defaultLocale: process.env.NUXT_PUBLIC_DEFAULT_LOCALE || 'el',
    debug: process.env.NUXT_PUBLIC_I18N_DEBUG === 'true',
    baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    restructureDir: 'i18n',
    detectBrowserLanguage: {
      useCookie: true,
      redirectOn: 'root',
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
          'breadcrumb/el-GR.json',
        ],
        language: 'el-GR',
        flag: '🇬🇷',
      },
    ],
    vueI18n: './i18n/i18n.config.mts',
    compilation: {
      strictMessage: false,
    },
  },
  css: [
    '~/assets/sass/tailwind.scss',
    '~/assets/sass/app.scss',
    '~/assets/sass/_cookies.scss',
    '~/assets/sass/_variables.scss',
    'v-calendar/style.css',
  ],
  runtimeConfig: {
    buildDate: new Date().toISOString(),
    secretKey: process.env.NUXT_SECRET_KEY,
    djangoUrl: process.env.NUXT_DJANGO_URL,
    cacheBase: process.env.NUXT_CACHE_BASE,
    cacheMaxAge: process.env.NUXT_CACHE_MAX_AGE,

    // Auth
    auth: {
      cookieDomain:
      process.env.NUXT_AUTH_COOKIE_DOMAIN,
    },

    oauth: {
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET,
      },
      discord: {
        clientId: process.env.NUXT_OAUTH_DISCORD_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_DISCORD_CLIENT_SECRET,
      },
      github: {
        clientId: process.env.NUXT_OAUTH_GITHUB_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET,
      },
      facebook: {
        clientId: process.env.NUXT_OAUTH_FACEBOOK_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_FACEBOOK_CLIENT_SECRET,
      },
    },

    turnstile: {
      secretKey: process.env.NUXT_TURNSTILE_SECRET_KEY,
    },

    redis: {
      port: process.env.NUXT_REDIS_PORT,
      host: process.env.NUXT_REDIS_HOST,
      ttl: process.env.NUXT_CACHE_MAX_AGE,
    },

    // Keys within public are also exposed client-side
    public: {
      appDescription: process.env.NUXT_PUBLIC_APP_DESCRIPTION,
      appKeywords: process.env.NUXT_PUBLIC_APP_KEYWORDS,
      appLogo: process.env.NUXT_PUBLIC_APP_LOGO,
      appTitle: process.env.NUXT_PUBLIC_APP_TITLE,
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL,
      author: {
        github_url: process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL,
        name: process.env.NUXT_PUBLIC_AUTHOR_NAME,
      },
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
      defaultLocale: process.env.NUXT_PUBLIC_LANGUAGE,
      djangoHost: process.env.NUXT_PUBLIC_DJANGO_HOST,
      djangoHostName: process.env.NUXT_PUBLIC_DJANGO_HOSTNAME,
      djangoStaticUrl: process.env.NUXT_PUBLIC_DJANGO_STATIC_URL,
      djangoUrl: process.env.NUXT_PUBLIC_DJANGO_URL,
      domainName: process.env.NUXT_PUBLIC_DOMAIN_NAME,
      environment: process.env.NUXT_PUBLIC_ENVIRONMENT,
      facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID,
      googleSiteVerification: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      language: process.env.NUXT_PUBLIC_LANGUAGE,
      mediaStreamDomain: process.env.NUXT_PUBLIC_MEDIA_STREAM_DOMAIN,
      mediaStreamOrigin: process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN,
      staticOrigin: process.env.NUXT_PUBLIC_STATIC_ORIGIN,
      mediaStreamPath: process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH,
      siteDescription: process.env.NUXT_PUBLIC_SITE_DESCRIPTION,
      siteName: process.env.NUXT_PUBLIC_SITE_NAME,
      googleGsiEnable: process.env.NUXT_PUBLIC_GOOGLE_GSI_ENABLE,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
      socials: {
        discord: process.env.NUXT_PUBLIC_SOCIALS_DISCORD,
        facebook: process.env.NUXT_PUBLIC_SOCIALS_FACEBOOK,
        instagram: process.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM,
        twitter: process.env.NUXT_PUBLIC_SOCIALS_TWITTER,
        tiktok: process.env.NUXT_PUBLIC_SOCIALS_TIKTOK,
        youtube: process.env.NUXT_PUBLIC_SOCIALS_YOUTUBE,
        reddit: process.env.NUXT_PUBLIC_SOCIALS_REDDIT,
        pinterest: process.env.NUXT_PUBLIC_SOCIALS_PINTEREST,
      },
      titleSeparator: process.env.NUXT_PUBLIC_TITLE_SEPARATOR,
      trailingSlash: String(process.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
      scripts: {
        googleAnalytics: {
          id: process.env.NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID,
        },
      },
    },
  },
  cookieControl: {
    cookies: {
      necessary: [
        {
          id: 'n',
          name: 'cookies.necessary',
          description: 'cookies.necessary_description',
          targetCookieIds: ['i18n_redirected', 'ncc_c', 'ncc_e'],
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
          id: 'functionality_storage',
          name: 'cookies.functionality_storage',
          description: 'cookies.functionality_storage_description',
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
  pinia: {
    storesDirs: ['/stores/**'],
  },
  vite: {
    plugins: [
      AutoImport({
        imports: ['vitest'],
        dts: true,
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            const chunks = ['v-calendar', 'zod', 'lottie']
            if (id.includes('/node_modules/')) {
              for (const chunkName of chunks) {
                if (id.includes(chunkName)) {
                  return chunkName
                }
              }
            }
          },
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },
  nitro: {
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    prerender: {
      crawlLinks: false,
      routes: [],
      ignore: ['/api', '/account', '/auth', '/checkout', '/cart'],
    },
    experimental: {
      asyncContext: true,
    },
  },
  eslint: {
    checker: true,
    config: {
      stylistic: true,
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
          quality: 90,
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
          width: 100,
          height: 100,
          fit: 'contain',
          position: 'entropy',
          background: 'transparent',
          trimThreshold: 5,
          path: '',
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
  pwa: {
    strategies: sw ? 'injectManifest' : 'generateSW',
    srcDir: sw ? 'service-worker' : undefined,
    filename: sw ? 'sw.ts' : undefined,
    injectRegister: 'auto',
    registerType: 'autoUpdate',
    manifest: {
      name: process.env.NUXT_PUBLIC_APP_TITLE,
      short_name: process.env.NUXT_PUBLIC_APP_TITLE,
      description:
      process.env.NUXT_PUBLIC_SITE_DESCRIPTION,
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'any',
      categories: ['ecommerce', 'technology'],
      screenshots: [
        {
          src: '/screenshots/540x720.png',
          type: 'image/png',
          sizes: '540x720',
          form_factor: 'narrow',
        },
        {
          src: '/screenshots/1024x593.png',
          type: 'image/png',
          sizes: '1024x593',
          form_factor: 'wide',
        },
      ],
      icons: [
        {
          src: '/favicon/android-icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/favicon/android-icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/favicon/android-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/favicon/android-icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/favicon/android-icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/favicon/android-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    },
    workbox: {
      navigateFallback: undefined,
      globPatterns: ['**/*.{js,css,html,json,webp,png,jpg,svg,ico}'],
      globIgnores: ['google*.html'],
      navigateFallbackDenylist: [/^\/api(?:\/.*)?$/],
      maximumFileSizeToCacheInBytes: 3000000,
      cleanupOutdatedCaches: true,
      sourcemap: false,
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    devOptions: {
      enabled: false,
      suppressWarnings: true,
      navigateFallback: undefined,
      type: 'module',
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 60 * 60,
    },
  },
  schemaOrg: {
    enabled: true,
    minify: true,
  },
  sitemap: {
    sitemaps: true,
    exclude: ['/account', '/account/**'],
    sources: [
      '/api/__sitemap__/urls',
    ],
    cacheTtl: 1000 * 60 * 60 * 24,
    runtimeCacheStorage: {
      driver: 'redis',
      port: process.env.NUXT_REDIS_PORT || 6379,
      host: process.env.NUXT_REDIS_HOST || 'redis-standalone',
      db: 0,
    },
  },
  linkChecker: {
    report: {
      html: true,
      markdown: true,
    },
    debug: false, // process.env.NODE_ENV !== 'production',
    enabled: false, // process.env.NODE_ENV !== 'production',
    excludeLinks: [
      process.env.NUXT_PUBLIC_SOCIALS_FACEBOOK,
      process.env.NUXT_PUBLIC_SOCIALS_TWITTER,
      process.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM,
      process.env.NUXT_PUBLIC_SOCIALS_DISCORD,
      process.env.NUXT_PUBLIC_SOCIALS_TIKTOK,
      process.env.NUXT_PUBLIC_SOCIALS_YOUTUBE,
      process.env.NUXT_PUBLIC_SOCIALS_REDDIT,
      process.env.NUXT_PUBLIC_SOCIALS_PINTEREST,
    ],
  },
  robots: {
    disallow: [],
  },
  veeValidate: {
    typedSchemaPackage: 'zod',
  },
  ogImage: {
    defaults: {
      cacheMaxAgeSeconds: 60 * 60 * 24 * 7 * 1000, // 7 days
    },
  },
  colorMode: {
    preference: 'system',
    fallback: 'light',
  },
  icon: {
    serverBundle: 'remote',
  },
  vitalizer: {
    disablePrefetchLinks: true,
    disablePreloadLinks: true,
    disableStylesheets: 'entry',
  },
  security: {
    headers: {
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
      contentSecurityPolicy: {
        'img-src': [
          '\'self\'',
          'data:',
          process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN || 'http://localhost:3003',
          process.env.NUXT_PUBLIC_STATIC_ORIGIN || 'http://localhost:8000',
        ],
        'style-src': [
          '\'self\'',
          'https:'
        ],
        'script-src': [
          '\'self\'',
          'https:',
          '\'unsafe-inline\'',
          '\'nonce-{{nonce}}\'',
          '\'strict-dynamic\'',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://static.cloudflareinsights.com',
        ],
        'script-src-attr': ['\'self\''],
        'script-src-elem': ['https://static.cloudflareinsights.com', '\'self\''],
      },
    },
    rateLimiter: {
      tokensPerInterval: process.env.NODE_ENV === 'production' ? 500 : 10000,
      interval: process.env.NODE_ENV === 'production' ? 150000 : 60000,
    },
  },
})
