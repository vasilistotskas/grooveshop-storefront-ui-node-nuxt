import { createI18n } from 'vue-i18n'

/**
 * Test-only Nuxt plugin that provides i18n fallback.
 *
 * In the vitest nuxt environment, the @nuxtjs/i18n module may fail to
 * fully initialize (e.g. browser detection, cookie access). This plugin
 * installs a minimal vue-i18n instance so that:
 * - `useNuxtApp().$i18n.t(key)` works in composables/stores
 * - `useI18n()` works in components (via the Vue plugin)
 *
 * The `missing` handler returns the raw key, which is sufficient for tests
 * that only check message existence, not exact translations.
 * Component-scoped `<i18n>` blocks are compiled by the Vite plugin and
 * merged automatically by vue-i18n.
 */
export default defineNuxtPlugin({
  name: 'test-i18n-mock',
  enforce: 'pre',
  setup(nuxtApp) {
    const i18n = createI18n({
      legacy: false,
      locale: 'el',
      fallbackLocale: 'el',
      messages: { el: {} },
      numberFormats: {
        el: {
          currency: {
            style: 'currency',
            currency: 'EUR',
            currencyDisplay: 'symbol',
          },
        },
      },
      missing: (_locale, key) => key,
      missingWarn: false,
      fallbackWarn: false,
    })

    nuxtApp.vueApp.use(i18n)
    nuxtApp.provide('i18n', i18n.global)
  },
})
