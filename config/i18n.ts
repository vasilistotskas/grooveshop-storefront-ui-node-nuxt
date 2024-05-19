import type { NuxtI18nOptions } from '@nuxtjs/i18n'

export const i18n = {
  strategy: 'prefix_except_default',
  lazy: true,
  defaultLocale: process.env.NUXT_PUBLIC_DEFAULT_LOCALE || 'el',
  debug: process.env.NUXT_PUBLIC_I18N_DEBUG === 'true',
  langDir: 'locales/',
  baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
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
        'el-GR.yml',
        'components/el-GR.yml',
        'pages/el-GR.yml',
        'routes/el-GR.yml',
        'breadcrumb/el-GR.yml',
      ],
      iso: 'el-GR',
      flag: '🇬🇷',
    },
  ],
  vueI18n: 'i18n.config.ts',
  compilation: {
    strictMessage: false,
  },
} satisfies NuxtI18nOptions
