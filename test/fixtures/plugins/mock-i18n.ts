import { createI18n } from 'vue-i18n'

/**
 * Test-only Nuxt plugin that provides i18n fallback.
 *
 * Runs `enforce: 'post'` so that @nuxtjs/i18n gets first chance to
 * install. If it succeeds, `nuxtApp.$i18n` is already set and this
 * plugin is a no-op. If it fails (e.g. browser detection, cookie
 * access), this plugin installs a minimal vue-i18n instance so that:
 * - `useNuxtApp().$i18n.t(key)` works in composables/stores
 * - `useI18n()` works in components (via the Vue plugin)
 *
 * Running `enforce: 'pre'` with `vueApp.use(i18n)` was the previous
 * approach, but vue-i18n@11 defines `$i18n` via a non-writable
 * Object.defineProperty getter. A second `app.use()` call from
 * @nuxtjs/i18n then throws "Cannot set property $i18n … which has
 * only a getter". Using `post` + a guard eliminates that conflict.
 *
 * The `missing` handler returns the raw key, which is sufficient for
 * tests that only check message existence, not exact translations.
 */
export default defineNuxtPlugin({
  name: 'test-i18n-mock',
  enforce: 'post',
  setup(nuxtApp) {
    // @nuxtjs/i18n already initialized successfully — nothing to do.
    if (nuxtApp.$i18n) return

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
