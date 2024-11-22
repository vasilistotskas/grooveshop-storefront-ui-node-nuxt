const sw = process.env.SW === 'true'

export default defineNuxtConfig({

  modules: [
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    '@nuxt/scripts',
    '@nuxt/fonts',
    '@nuxtjs/i18n',
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
  ssr: true,
  imports: {
    autoImport: true,
    dirs: [
      'stores/**',
      '../shared/**',
    ],
  },
  devtools: {
    enabled: process.env.NODE_ENV !== 'production',
    timeline: { enabled: true },
  },
  app: {
    head: {
      viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
      charset: 'utf-8',
      titleTemplate: '%s %separator %siteName',
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/png', href: '/favicon/favicon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
        { rel: 'icon', type: 'image/png', href: '/favicon/favicon-16x16.png' },
        { rel: 'apple-touch-icon', href: '/favicon/apple-touch-icon.png' },
      ],
    },
  },
  css: [
    '~/assets/sass/app.scss',
    '~/assets/sass/_cookies.scss',
    '~/assets/sass/_variables.scss',
  ],
  site: {
    url: 'http://localhost:3000',
    name: '',
    description: '',
    defaultLocale: 'el',
  },
  colorMode: {
    preference: 'system',
    fallback: 'light',
  },
  runtimeConfig: {
    // General Settings
    buildDate: new Date().toISOString(),
    cacheBase: 'redis',
    cacheMaxAge: '7200',
    djangoUrl: 'localhost:8000',
    secretKey: '', // should be in .env var NUXT_SECRET_KEY

    // Authentication
    auth: {
      cookieDomain: 'localhost',
    },

    // OAuth Providers
    oauth: {
      discord: {
        clientId: '',
        clientSecret: '',
      },
      facebook: {
        clientId: '',
        clientSecret: '',
      },
      github: {
        clientId: '',
        clientSecret: '',
      },
      google: {
        clientId: '',
        clientSecret: '',
      },
    },

    // Third-Party Integrations
    turnstile: {
      secretKey: '',
    },
    redis: {
      host: 'localhost',
      port: '6379',
      ttl: '7200',
    },

    // Public Configuration (Exposed Client-Side)
    public: {
      // Application Details
      appKeywords: '',
      appLogo: '',
      appTitle: '',
      apiBaseUrl: '',
      baseUrl: 'http://localhost:3000',
      environment: 'development',

      // Author Information
      author: {
        github_url: '',
        name: '',
      },

      // Django Settings
      djangoHost: 'localhost:8000',
      djangoHostName: 'localhost:8000',
      djangoUrl: 'http://localhost:8000',

      // Social Media Integrations
      facebookAppId: '',
      socials: {
        discord: '',
        facebook: '',
        instagram: '',
        pinterest: '',
        reddit: '',
        tiktok: '',
        twitter: '',
        youtube: '',
      },

      // Verification & Tracking
      domainVerifyId: '',
      googleGsiEnable: '',
      googleSiteVerification: '',
      mediaStreamOrigin: 'http://localhost:3003',
      mediaStreamPath: 'http://localhost:3003/media_stream-image',
      scripts: {
        googleAnalytics: {
          id: '',
        },
      },

      // Internationalization
      i18n: {
        baseUrl: 'http://localhost:3000',
      },

      // Miscellaneous
      titleSeparator: '-',
      trailingSlash: String(process.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
    },
  },
  build: {
    analyze: true,
    transpile: ['@iconify', '@unocss', '@unhead'],
  },
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
    '/index': { redirect: '/' },
  },
  sourcemap: {
    server: false,
    client: true,
  },
  future: {
    compatibilityVersion: 4,
    typescriptBundlerResolution: true,
  },
  features: {
    inlineStyles: true,
  },
  experimental: {
    typedPages: true,
    asyncContext: true,
    cookieStore: true,
    watcher: 'parcel',
  },
  compatibilityDate: '2024-11-01',
  nitro: {
    imports: {
      dirs: [
        'shared/**',
      ],
    },
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    prerender: {
      crawlLinks: false,
      ignore: [],
    },
    experimental: {
      asyncContext: true,
    },
  },
  vite: {
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            const chunks = ['zod', 'lottie']
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
  typescript: {
    strict: true,
    typeCheck: false, // Until vue-tsc is fixed
    builder: 'vite',
  },
  telemetry: false,
  debug: false,
  hooks: {
    'build:manifest': (manifest) => {
      const css = manifest['node_modules/nuxt/dist/app/entry.js']?.css
      if (css) {
        for (let i = css.length - 1; i >= 0; i--) {
          if (css[i]?.startsWith('entry')) css.splice(i, 1)
        }
      }
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
  eslint: {
    checker: true,
    config: {
      stylistic: true,
    },
  },
  i18n: {
    strategy: 'prefix_except_default',
    lazy: true,
    defaultLocale: 'el',
    debug: process.env.NODE_ENV !== 'production',
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
  icon: {
    serverBundle: 'remote',
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
  linkChecker: {
    report: {
      html: true,
      markdown: true,
    },
    debug: process.env.NODE_ENV !== 'production',
    enabled: process.env.NODE_ENV !== 'production',
  },
  ogImage: {
    defaults: {
      cacheMaxAgeSeconds: 60 * 60 * 24 * 7 * 1000, // 7 days
    },
  },
  pinia: {
    storesDirs: ['/stores/**'],
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
      process.env.NUXT_SITE_DESCRIPTION,
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
  robots: {
    disallow: [
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
  },
  schemaOrg: {
    enabled: true,
    minify: true,
  },
  security: {
    strict: false,
    nonce: true,
    sri: true,
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
        'frame-src': [
          '\'self\'',
          'https://www.youtube.com',
        ],
        'script-src': [
          '\'self\'',
          '\'nonce-{{nonce}}\'',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://static.cloudflareinsights.com',
          `${process.env.NUXT_SITE_URL}/cdn-cgi/speculation`,
        ],
        'script-src-attr': [
          '\'self\'',
          '\'nonce-{{nonce}}\'',
        ],
        'script-src-elem': [
          'https://static.cloudflareinsights.com',
          '\'self\'',
          '\'nonce-{{nonce}}\'',
        ],
      },
    },
    rateLimiter: {
      tokensPerInterval: process.env.NODE_ENV === 'production' ? 1500 : 10000,
      interval: process.env.NODE_ENV === 'production' ? 300000 : 60000,
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
      '/products',
      '/return-policy',
    ],
    sources: [
      '/api/__sitemap__/urls',
    ],
    cacheTtl: 1000 * 60 * 60 * 24,
    runtimeCacheStorage: {
      driver: 'redis',
      port: 6379,
      host: 'redis-standalone',
      db: 0,
    },
  },
  veeValidate: {
    typedSchemaPackage: 'zod',
    autoImports: false,
  },
  vitalizer: {
    disablePrefetchLinks: true,
    disablePreloadLinks: true,
    disableStylesheets: 'entry',
  },
})
