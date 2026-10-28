/**
 * Layers the store's edited texts over the build's defaults
 * (django-api #218).
 *
 * The defaults stay where they are: each component's `<i18n>` block and
 * the global locale files. A store's overrides are sparse and travel on
 * their own, `GET /api/texts/overrides` (cached per store, language and
 * epoch), so a store without any costs a cache hit per render and the
 * browser nothing: the server fetches them for the page's locale and the
 * client reads them from the payload.
 *
 * - `global` texts are merged here into the global composer.
 * - Every other namespace is a component's: `useStoreI18n` merges its own
 *   into the component's local composer from the state this plugin fills.
 *
 * A language switch loads the new language's texts BEFORE the locale
 * changes (`i18n:beforeLocaleSwitch`, which the router awaits), so the
 * switch never shows the defaults first.
 *
 * The global merge cannot be done once and left: @nuxtjs/i18n loads a
 * locale's messages by merging the whole fallback chain into the global
 * composer, and does so more than once around a switch (measured on a
 * switch to English: Greek is merged again BEFORE `i18n:localeSwitched`,
 * and both languages AFTER it), each time putting the defaults back over
 * the store's texts. So the composer's `mergeLocaleMessage` and
 * `setLocaleMessage` re-apply the store's global texts for the locale they
 * just wrote; no load, in any order, can leave a default over an override.
 *
 * A failed fetch renders with the defaults, on the server and in the
 * browser: one endpoint's hiccup must not take every page down. On the
 * server it is logged at ERROR and the render is kept out of every cache
 * (`shared/constants/degradedRender.ts`), so the defaults cannot outlive
 * the failure and hide the store's wording; the next request asks again.
 */
export default defineNuxtPlugin({
  name: 'text-overrides',
  dependsOn: ['i18n:plugin', 'api'],
  async setup(nuxtApp) {
    const i18n = nuxtApp.$i18n
    const overrides = useTextOverrides()
    const requestApi = useRequestApi()
    const event = useRequestEvent()
    const tenant = useTenant()
    const loading = new Map<string, Promise<void>>()

    // The page's own locale is fetched by the server and travels in the
    // payload; the browser asks only for a locale it has not seen.
    const hydrated = import.meta.client && nuxtApp.payload.serverRendered ? i18n.locale.value : undefined

    const merge = i18n.mergeLocaleMessage.bind(i18n)
    const set = i18n.setLocaleMessage.bind(i18n)
    const applyGlobal = (locale: string) => {
      mergeStoreTexts({ getLocaleMessage: i18n.getLocaleMessage, mergeLocaleMessage: merge }, locale, GLOBAL_TEXT_NAMESPACE, overrides.value?.[locale]?.[GLOBAL_TEXT_NAMESPACE])
    }
    i18n.mergeLocaleMessage = ((locale: string, messages: never) => {
      merge(locale, messages)
      applyGlobal(locale)
    }) as typeof i18n.mergeLocaleMessage
    i18n.setLocaleMessage = ((locale: string, messages: never) => {
      set(locale, messages)
      applyGlobal(locale)
    }) as typeof i18n.setLocaleMessage

    const fetchLocale = async (locale: string) => {
      const fetched = await requestApi<TextOverrides>('/api/texts/overrides', { query: { language: locale } })
      if (Object.keys(fetched).length > 0) {
        overrides.value = { ...overrides.value, [locale]: fetched }
        applyGlobal(locale)
      }
    }

    const load = (locale: string) => {
      if (locale === hydrated) return Promise.resolve()
      let pending = loading.get(locale)
      if (!pending) {
        pending = fetchLocale(locale).catch((error: unknown) => {
          loading.delete(locale)
          throw error
        })
        loading.set(locale, pending)
      }
      return pending
    }

    const loadOrKeepDefaults = async (locale: string) => {
      try {
        await load(locale)
      }
      catch (error) {
        if (import.meta.server && event) {
          // The request's wide event: one error line carrying the store.
          event.context.log?.error(error instanceof Error ? error : String(error), { action: 'text-overrides:unavailable', store: tenant.value?.schemaName, locale })
          markDegradedRender(event)
          return
        }
        log.warn({ tag: 'text-overrides', message: 'could not load the store\'s texts, keeping the defaults', locale, error })
      }
    }

    nuxtApp.hook('i18n:beforeLocaleSwitch', async ({ newLocale }) => {
      await loadOrKeepDefaults(newLocale)
    })

    const locale = i18n.locale.value
    await loadOrKeepDefaults(locale)
    applyGlobal(locale)
  },
})
