import AutoImport from 'unplugin-auto-import/vite'

const sw = process.env.SW === 'true'

export default defineNuxtConfig({
  ssr: true,
  debug: false,
  sourcemap: {
    server: false,
    client: true,
  },
  telemetry: false,
  future: {
    compatibilityVersion: 4,
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
    '@nuxtjs/html-validator',
    '@nuxtjs/device',
    '@nuxtjs/turnstile',
    '@nuxtjs/seo',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@vee-validate/nuxt',
    'nuxt-auth-utils',
    'nuxt-time',
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
    transpile: ['@iconify', '@unocss'],
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
          'components/el-GR.json',
          'pages/el-GR.json',
          'routes/el-GR.json',
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
    '~/assets/sass/_cookies.scss',
    '~/assets/sass/_variables.scss',
    '~/assets/sass/app.scss',
    'v-calendar/style.css',
  ],
  runtimeConfig: {
    buildDate: new Date().toISOString(),

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
    },

    turnstile: {
      secretKey: process.env.NUXT_TURNSTILE_SECRET_KEY,
    },

    // Keys within public are also exposed client-side
    public: {
      appDescription: process.env.NUXT_PUBLIC_APP_DESCRIPTION,
      appLogo: process.env.NUXT_PUBLIC_APP_LOGO,
      appTitle: process.env.NUXT_PUBLIC_APP_TITLE,
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL,
      author: {
        github_url: process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL,
        name: process.env.NUXT_PUBLIC_AUTHOR_NAME,
      },
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
      canonicalUrl: process.env.NUXT_PUBLIC_CANONICAL_URL,
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
      mediaStreamPath: process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH,
      siteDescription: process.env.NUXT_PUBLIC_SITE_DESCRIPTION,
      siteName: process.env.NUXT_PUBLIC_SITE_NAME,
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
          name: 'components.cookie.cookies.necessary',
          description: 'components.cookie.cookies.necessary_description',
          targetCookieIds: ['NEC'],
        },
      ],
      optional: [
        {
          id: 'an',
          name: 'components.cookie.cookies.analytics',
          description: 'components.cookie.cookies.analytics_description',
          targetCookieIds: ['_ga', '_gat', '_gid'],
        },
        {
          id: 'ad',
          name: 'components.cookie.cookies.advertising',
          description: 'components.cookie.cookies.advertising_description',
          links: {
            ['/privacy-policy']:
              'components.cookie.cookies.optional_links.privacy_policy',
          },
          targetCookieIds: ['_fbp', 'fr', 'tr'],
        },
        {
          id: 'fu',
          name: 'components.cookie.cookies.functional',
          description: 'components.cookie.cookies.functional_description',
          targetCookieIds: ['_fbc', 'fbsr_'],
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
  },
  scripts: {
    registry: {
      googleAnalytics: true,
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
  htmlValidator: {
    usePrettier: false,
    logLevel: 'verbose',
    failOnError: false,
    options: {
      rules: {
        'unrecognized-char-ref': 'off',
        'wcag/h30': 'warn',
        'wcag/h37': 'warn',
        'element-permitted-content': 'warn',
        'element-required-attributes': 'warn',
        'attribute-empty-style': 'off',
        'prefer-native-element': 'off',
      },
    },
  },
  veeValidate: {
    autoImports: true,
    componentNames: {
      Form: 'VeeForm',
      Field: 'VeeField',
      FieldArray: 'VeeFieldArray',
      ErrorMessage: 'VeeErrorMessage',
    },
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
  turnstile: {
    siteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
  icon: {
    serverBundle: 'remote',
  },
})
