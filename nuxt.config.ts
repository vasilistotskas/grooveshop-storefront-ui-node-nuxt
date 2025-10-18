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
    'nuxt-security',
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
  features: {
    inlineStyles: true,
  },
  experimental: {
    typedPages: true,
    asyncContext: true,
    cookieStore: true,
    payloadExtraction: true,
    inlineRouteRules: true,
  },
  compatibilityDate: 'latest',
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
    debug: false,
    enabled: false,
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
          'https://js.stripe.com',
        ],
        'script-src': [
          '\'self\'',
          '\'nonce-{{nonce}}\'',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://static.cloudflareinsights.com',
          'https://js.stripe.com',
          `${process.env.NUXT_SITE_URL}/cdn-cgi/speculation`,
          `${process.env.NUXT_SITE_URL}`,
        ],
        'script-src-attr': [
          '\'self\'',
          '\'nonce-{{nonce}}\'',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://static.cloudflareinsights.com',
          'https://js.stripe.com',
        ],
        'script-src-elem': [
          '\'self\'',
          '\'nonce-{{nonce}}\'',
          'https://www.googletagmanager.com',
          'https://static.cloudflareinsights.com',
          'https://js.stripe.com',
          `${process.env.NUXT_SITE_URL}`,
        ],
        'worker-src': [
          '\'self\'',
          `${process.env.NUXT_SITE_URL}`,
          'blob:',
        ],
      },
    },
    requestSizeLimiter: false,
    rateLimiter: false,
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
