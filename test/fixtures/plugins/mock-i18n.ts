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
 * only a getter". Using `post` + guarding on `globalProperties.$i18n`
 * eliminates that conflict: if @nuxtjs/i18n installed the Vue plugin
 * but failed before nuxtApp.provide('i18n', …), we bridge the gap by
 * providing it ourselves rather than re-installing the plugin.
 *
 * The `missing` handler returns the raw key, which is sufficient for
 * tests that only check message existence, not exact translations.
 */
export default defineNuxtPlugin({
  name: 'test-i18n-mock',
  enforce: 'post',
  setup(nuxtApp) {
    const globalProperties = nuxtApp.vueApp.config.globalProperties

    if (globalProperties.$i18n) {
      // vue-i18n was installed by @nuxtjs/i18n. If it failed before calling
      // nuxtApp.provide('i18n', ...) the $i18n getter exists on globalProperties
      // but nuxtApp.$i18n is still undefined. Bridge that gap so that
      // `const { $i18n } = useNuxtApp()` works in stores/composables.
      if (!nuxtApp.$i18n) {
        nuxtApp.provide('i18n', globalProperties.$i18n)
      }
      return
    }

    // vue-i18n was never installed (e.g. @nuxtjs/i18n failed before vueApp.use).
    // Install a minimal fallback instance.
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
