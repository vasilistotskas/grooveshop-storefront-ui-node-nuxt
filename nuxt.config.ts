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
    '@vee-validate/nuxt',
    'nuxt-auth-utils',
    'nuxt-mcp',
    'nuxt-security',
  ],
  ssr: true,
  imports: {
    autoImport: true,
    dirs: [
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
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
        { rel: 'icon', type: 'image/png', href: '/favicon/favicon-16x16.png' },
        { rel: 'apple-touch-icon', href: '/favicon/apple-touch-icon.png' },
      ],
    },
  },
  css: [
    '~/assets/css/main.css',
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
    storage: 'cookie',
  },
  runtimeConfig: {
    buildDate: new Date().toISOString(),
    apiBaseUrl: 'http://localhost:8000/api/v1',
    mediaStreamPath: 'http://localhost:3003/media_stream-image',
    cacheBase: 'cache',
    cacheMaxAge: '30',
    djangoUrl: 'http://localhost:8000',
    secretKey: '',
    auth: {
      cookieDomain: 'localhost',
    },
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
    turnstile: {
      secretKey: '',
    },
    redis: {
      host: 'localhost',
      port: '6379',
      ttl: '30',
    },
    public: {
      appKeywords: '',
      appLogo: '',
      appTitle: '',
      baseUrl: 'http://localhost:3000',
      apiBaseUrl: 'http://localhost:8000/api/v1',
      environment: 'development',
      author: {
        github_url: '',
        name: '',
      },
      djangoHost: 'localhost:8000',
      djangoHostName: 'localhost:8000',
      djangoUrl: 'http://localhost:8000',
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
      domainVerifyId: '',
      googleGsiEnable: false,
      googleSiteVerification: '',
      mediaStreamOrigin: 'http://localhost:3003',
      mediaStreamPath: 'http://localhost:3003/media_stream-image',
      scripts: {
        googleAnalytics: {
          id: '',
        },
        googleTagManager: {
          id: '',
        },
      },
      titleSeparator: '-',
      trailingSlash: String(process.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
      static: {
        origin: 'http://localhost:8000',
      },
    },
  },
  build: {
    analyze: true,
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
    defaults: {
      nuxtLink: {
        prefetch: false,
      },
    },
  },
  compatibilityDate: '2025-05-06',
  nitro: {
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
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
    builder: 'vite',
  },
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
  },
  icon: {
    serverBundle: {
      externalizeIconsJson: false,
      collections: ['heroicons', 'heroicons-solid', 'heroicons-outline', 'ant-design', 'fa-solid', 'fa6-solid', 'mdi'],
    },
    clientBundle: {
      scan: true,
      sizeLimitKb: 256,
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
          'https://www.googletagmanager.com',
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
          `${process.env.NUXT_SITE_URL}`,
        ],
        'script-src-attr': [
          '\'self\'',
          '\'nonce-{{nonce}}\'',
          'https://www.googletagmanager.com',
        ],
        'script-src-elem': [
          '\'self\'',
          '\'nonce-{{nonce}}\'',
          'https://www.googletagmanager.com',
          'https://static.cloudflareinsights.com',
          `${process.env.NUXT_SITE_URL}`,
        ],
        'worker-src': [
          '\'self\'',
          `${process.env.NUXT_SITE_URL}`,
          'blob:',
        ],
      },
    },
    rateLimiter: {
      tokensPerInterval: process.env.NODE_ENV === 'production' ? 600 : 10000,
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
    cacheMaxAgeSeconds: 1000 * 60 * 60 * 24,
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
})
